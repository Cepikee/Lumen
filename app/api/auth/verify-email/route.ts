// /app/api/auth/verify-email/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashOneTimeToken } from "@/lib/one-time-token";

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, message: "Érvénytelen JSON kérés." }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: "Érvénytelen kérés törzs." }, { status: 400 });
    }
    const { token } = body as { token?: unknown };

    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
      return NextResponse.json({ success: false, message: "Hiányzó token" }, { status: 400 });
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
    }, { status: 500 });
  }
}
