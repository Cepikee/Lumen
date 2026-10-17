import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { getSessionUserId } from "@/lib/auth-session";
import { sendEmailVerification } from "@/lib/email-verification";
import { getIp, requireTrustedOrigin } from "@/lib/security";
import { consumeRateLimitFailClosed } from "@/lib/shared-rate-limit";

export async function POST(req: Request) {
  try {
    const originDenied = requireTrustedOrigin(req);
    if (originDenied) return originDenied;

    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ success: false, message: "Nincs bejelentkezve" }, { status: 401 });

    const ip = getIp(req);
    const [userAllowed, ipAllowed] = await Promise.all([
      consumeRateLimitFailClosed(db, { scope: "email-verification-user", identity: String(userId), limit: 3, windowMs: 30 * 60_000 }),
      consumeRateLimitFailClosed(db, { scope: "email-verification-ip", identity: ip, limit: 10, windowMs: 30 * 60_000 }),
    ]);
    if (!userAllowed || !ipAllowed) {
      return NextResponse.json({ success: false, message: "Túl sok kérés. Próbáld újra később." }, { status: 429 });
    }

    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT email, email_verified FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
    const user = rows[0];
    if (!user) return NextResponse.json({ success: false, message: "User nem található" }, { status: 404 });
    if (Number(user.email_verified) === 1) return NextResponse.json({ success: true, alreadyVerified: true });

    await sendEmailVerification(userId, String(user.email));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: "Hiba történt a token generálásakor." }, { status: 500 });
  }
}
