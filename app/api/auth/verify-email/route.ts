// /app/api/auth/verify-email/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashOneTimeToken } from "@/lib/one-time-token";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
      return NextResponse.json({ success: false, message: "Hiányzó token" });
    }

    const [result] = await db.query(
      `
      UPDATE users
      SET email_verified = 1,
          email_verification_token = NULL,
          email_verification_expires = NULL
      WHERE email_verification_token = ?
        AND email_verification_expires > UTC_TIMESTAMP()
      `,
      [hashOneTimeToken(token)]
    );

    if ((result as { affectedRows?: number }).affectedRows !== 1) {
      return NextResponse.json({ success: false, message: "Érvénytelen vagy lejárt token" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({
      success: false,
      message: "Hiba történt az email megerősítésekor.",
    });
  }
}
