import { createSession, getSessionUserId } from "@/lib/auth-session";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { validatePassword } from "@/lib/auth-policy";
import { getIp, requireTrustedOrigin } from "@/lib/security";
import { consumeRateLimitFailClosed } from "@/lib/shared-rate-limit";

export async function POST(req: Request) {
  try {
    const originDenied = requireTrustedOrigin(req);
    if (originDenied) return originDenied;

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > 16000) {
      return NextResponse.json({ success: false, message: "Túl nagy kérés." }, { status: 413 });
    }

    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Nincs bejelentkezve." },
        { status: 401 },
      );
    }

    const ip = getIp(req);
    const [userAllowed, ipAllowed] = await Promise.all([
      consumeRateLimitFailClosed(db, {
        scope: "change-password-user",
        identity: String(userId),
        limit: 6,
        windowMs: 15 * 60_000,
      }),
      (ip === "direct" || ip === "unknown")
        ? Promise.resolve(true)
        : consumeRateLimitFailClosed(db, {
            scope: "change-password-ip",
            identity: ip,
            limit: 20,
            windowMs: 15 * 60_000,
          }),
    ]);
    if (!userAllowed || !ipAllowed) {
      return NextResponse.json(
        { success: false, message: "Túl sok próbálkozás. Próbáld újra később." },
        { status: 429 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Érvénytelen kérés." },
        { status: 400 },
      );
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Érvénytelen kérés." },
        { status: 400 },
      );
    }

    const { currentPassword, newPassword } = body as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };
    if (typeof currentPassword !== "string" || typeof newPassword !== "string" || !currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Minden mező kötelező." },
        { status: 400 },
      );
    }

    const passwordPolicy = validatePassword(newPassword);
    if (!passwordPolicy.valid) {
      return NextResponse.json(
        { success: false, message: passwordPolicy.message },
        { status: 400 },
      );
    }

    const [rows]: any = await db.query(
      "SELECT id, password_hash FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Felhasználó nem található." },
        { status: 404 },
      );
    }

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) {
      return NextResponse.json(
        { success: false, message: "Hibás jelenlegi jelszó." },
        { status: 400 },
      );
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        [hashed, userId],
      );
      await connection.query("DELETE FROM user_sessions WHERE user_id = ?", [userId]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    // All pre-existing sessions are invalidated after a credential change.
    // Give the browser that performed the change a fresh short-lived session.
    const response = NextResponse.json({ success: true, sessionsRotated: true });
    await createSession(userId, response, false);
    return response;
  } catch (err) {
    console.error("Password change error:", err);
    return NextResponse.json(
      { success: false, message: "Váratlan hiba történt." },
      { status: 500 },
    );
  }
}
