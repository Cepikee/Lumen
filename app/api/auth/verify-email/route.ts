// /app/api/auth/verify-email/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ success: false, message: "Hiányzó token" });
    }

    // 🔥 Token ellenőrzése
    const [rows] = await db.query<RowDataPacket[]>(
      `
      SELECT id, email_verification_expires
      FROM users
      WHERE email_verification_token = ?
      LIMIT 1
      `,
      [token]
    );

    const user = rows[0];

    if (!user) {
      return NextResponse.json({ success: false, message: "Érvénytelen token" });
    }

    // 🔥 Lejárt token?
    if (new Date(user.email_verification_expires) < new Date()) {
      return NextResponse.json({ success: false, message: "A token lejárt" });
    }

    // 🔥 Email megerősítése
    await db.query(
      `
      UPDATE users
      SET email_verified = 1,
          email_verification_token = NULL,
          email_verification_expires = NULL
      WHERE id = ?
      `,
      [user.id]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({
      success: false,
      message: "Hiba történt az email megerősítésekor.",
    });
  }
}
