import { getSessionUserId } from "@/lib/auth-session";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mailer } from "@/lib/mailer";
import { getIp, requireTrustedOrigin } from "@/lib/security";
import { consumeRateLimitFailClosed } from "@/lib/shared-rate-limit";
import { readJsonBodyWithLimit } from "@/lib/request-body";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] || char));
}

export async function POST(req: Request) {
  try {
    const originDenied = requireTrustedOrigin(req);
    if (originDenied) return originDenied;

    const ip = getIp(req);
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ success: false, message: "Nem vagy bejelentkezve." }, { status: 401 });
    }

    const allowed = await consumeRateLimitFailClosed(db, {
      scope: "username-change",
      identity: `${userId}:${ip}`,
      limit: 5,
      windowMs: 60 * 60_000,
    });
    if (!allowed) {
      return NextResponse.json({ success: false, message: "Túl sok kérés. Próbáld újra később." }, { status: 429 });
    }

    const parsedBody = await readJsonBodyWithLimit(req, 8_000);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { success: false, message: parsedBody.status === 413 ? "Túl nagy kérés." : "Érvénytelen kérés." },
        { status: parsedBody.status },
      );
    }
    if (!parsedBody.value || typeof parsedBody.value !== "object" || Array.isArray(parsedBody.value)) {
      return NextResponse.json({ success: false, message: "Érvénytelen kérés." }, { status: 400 });
    }

    const rawUsername = (parsedBody.value as { newUsername?: unknown }).newUsername;
    if (typeof rawUsername !== "string") {
      return NextResponse.json({ success: false, message: "Új felhasználónév megadása kötelező." }, { status: 400 });
    }
    const username = rawUsername.trim();
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ success: false, message: "A felhasználónév 3–20 karakter között lehet." }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      return NextResponse.json({
        success: false,
        message: "A felhasználónév csak betűket, számokat, pontot, kötőjelet és aláhúzást tartalmazhat.",
      }, { status: 400 });
    }
    if (/^[0-9]+$/.test(username)) {
      return NextResponse.json({ success: false, message: "A felhasználónév nem lehet csak szám." }, { status: 400 });
    }
    if (["admin", "moderator", "support", "utom", "system"].includes(username.toLowerCase())) {
      return NextResponse.json({ success: false, message: "Ez a felhasználónév nem használható." }, { status: 400 });
    }

    const connection = await db.getConnection();
    let oldNickname = "";
    let userEmail = "";
    try {
      await connection.beginTransaction();
      // Lock the account row so two parallel requests cannot both pass the
      // 30-day cooldown check and update the username.
      const [rows]: any = await connection.query(
        `SELECT email, nickname, username_changed_at,
                TIMESTAMPDIFF(DAY, username_changed_at, UTC_TIMESTAMP()) AS days_since_change
         FROM users WHERE id = ? LIMIT 1 FOR UPDATE`,
        [userId],
      );
      if (!rows.length) {
        await connection.rollback();
        return NextResponse.json({ success: false, message: "Felhasználó nem található." }, { status: 404 });
      }

      const user = rows[0];
      oldNickname = String(user.nickname || "");
      userEmail = String(user.email || "");
      if (oldNickname === username) {
        await connection.rollback();
        return NextResponse.json({ success: false, message: "Ez már a jelenlegi felhasználóneved." }, { status: 400 });
      }

      if (user.username_changed_at && Number(user.days_since_change) < 30) {
        const remaining = Math.max(1, 30 - Number(user.days_since_change || 0));
        await connection.rollback();
        return NextResponse.json({
          success: false,
          message: `Felhasználónevet 30 naponta egyszer változtathatsz. Hátralévő napok: ${remaining}.`,
        }, { status: 400 });
      }

      const [exists]: any = await connection.query(
        "SELECT id FROM users WHERE nickname = ? AND id <> ? LIMIT 1",
        [username, userId],
      );
      if (exists.length > 0) {
        await connection.rollback();
        return NextResponse.json({ success: false, message: "Ez a felhasználónév már foglalt." }, { status: 409 });
      }

      await connection.query(
        "UPDATE users SET nickname = ?, username_changed_at = UTC_TIMESTAMP() WHERE id = ?",
        [username, userId],
      );
      try {
        await connection.query(
          "INSERT INTO username_change_log (user_id, old_name, new_name, ip) VALUES (?, ?, ?, ?)",
          [userId, oldNickname, username, ip],
        );
      } catch {
        // Audit logging is best-effort and must not roll back the account update.
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    try {
      const safeOld = escapeHtml(oldNickname);
      const safeNew = escapeHtml(username);
      await mailer.sendMail({
        from: `"Utom.hu" <noreply@utom.hu>`,
        to: userEmail,
        subject: "Felhasználónév módosítva",
        html: `
          <p>Szia!</p>
          <p>A felhasználóneved sikeresen megváltozott.</p>
          <p><strong>Régi név:</strong> ${safeOld}</p>
          <p><strong>Új név:</strong> ${safeNew}</p>
          <p>Ha nem te kezdeményezted a módosítást, azonnal változtasd meg a jelszavadat és PIN kódodat!</p>
          <p>Üdv,<br>Utom.hu</p>
        `,
      });
    } catch (error) {
      console.error("Username change notification failed:", error instanceof Error ? error.message : "unknown_error");
    }

    return NextResponse.json({
      success: true,
      message: "A felhasználónév sikeresen megváltozott.",
      newUsername: username,
    });
  } catch (err: any) {
    if (err?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ success: false, message: "Ez a felhasználónév már foglalt." }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: "Váratlan hiba történt." }, { status: 500 });
  }
}
