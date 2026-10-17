import { createSession, getSessionUserId } from "@/lib/auth-session";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validatePin } from "@/lib/auth-policy";
import { hashPin, verifyPin } from "@/lib/pin-security";
import { getIp, requireTrustedOrigin } from "@/lib/security";
import { consumeRateLimitFailClosed } from "@/lib/shared-rate-limit";
import { readJsonBodyWithLimit } from "@/lib/request-body";

export async function POST(req: Request) {
  try {
    const originDenied = requireTrustedOrigin(req);
    if (originDenied) return originDenied;


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
        scope: "change-pin-user",
        identity: String(userId),
        limit: 8,
        windowMs: 15 * 60_000,
      }),
      (ip === "direct" || ip === "unknown")
        ? Promise.resolve(true)
        : consumeRateLimitFailClosed(db, {
            scope: "change-pin-ip",
            identity: ip,
            limit: 24,
            windowMs: 15 * 60_000,
          }),
    ]);
    if (!userAllowed || !ipAllowed) {
      return NextResponse.json(
        { success: false, message: "Túl sok próbálkozás. Próbáld újra később." },
        { status: 429 },
      );
    }

    const parsedBody = await readJsonBodyWithLimit(req, 8_000);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { success: false, message: parsedBody.status === 413 ? "Túl nagy kérés." : "Érvénytelen kérés." },
        { status: parsedBody.status },
      );
    }
    const body = parsedBody.value;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Érvénytelen kérés." },
        { status: 400 },
      );
    }

    const { currentPin, newPin } = body as { currentPin?: unknown; newPin?: unknown };
    if (typeof currentPin !== "string" || typeof newPin !== "string" || !currentPin || !newPin) {
      return NextResponse.json(
        { success: false, message: "Minden mező kötelező." },
        { status: 400 },
      );
    }
    if (!validatePin(newPin)) {
      return NextResponse.json(
        { success: false, message: "A PIN kódnak 4 számjegyből kell állnia." },
        { status: 400 },
      );
    }

    const [rows]: any = await db.query(
      "SELECT id, pin_code FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Felhasználó nem található." },
        { status: 404 },
      );
    }

    if (!(await verifyPin(currentPin, rows[0].pin_code)).valid) {
      return NextResponse.json(
        { success: false, message: "Hibás jelenlegi PIN." },
        { status: 400 },
      );
    }

    const newHash = await hashPin(newPin);
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("UPDATE users SET pin_code = ? WHERE id = ?", [newHash, userId]);
      await connection.query("DELETE FROM user_sessions WHERE user_id = ?", [userId]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const response = NextResponse.json({ success: true, sessionsRotated: true });
    await createSession(userId, response, false);
    return response;
  } catch (err) {
    console.error("PIN change error:", err);
    return NextResponse.json(
      { success: false, message: "Váratlan hiba történt." },
      { status: 500 },
    );
  }
}
