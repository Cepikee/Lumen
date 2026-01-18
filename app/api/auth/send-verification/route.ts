import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { mailer } from "@/lib/mailer";
import type { RowDataPacket } from "mysql2";

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, message: "Hiányzó userId" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60);

    await db.query(
      `
      UPDATE users
      SET email_verification_token = ?, email_verification_expires = ?
      WHERE id = ?
      `,
      [token, expires, userId]
    );

    // 🔥 User email lekérése — TÍPUSOSAN
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT email FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    const user = rows[0];

    if (!user) {
      return NextResponse.json({ success: false, message: "User nem található" });
    }

    const verifyUrl = `https://utom.hu/verify-email?token=${token}`;

    await mailer.sendMail({
      from: `"Utom.hu" <noreply@utom.hu>`,   // 🔥 CPanel kötelező!
      to: user.email,
      subject: "Erősítsd meg az email címed",
      html: `
        <h2>Üdv az Utom.hu-n!</h2>
        <p>Kattints az alábbi linkre az email címed megerősítéséhez:</p>
        <p><a href="${verifyUrl}" target="_blank">Email megerősítése</a></p>
        <p>Ha nem te kérted, hagyd figyelmen kívül.</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({
      success: false,
      message: "Hiba történt a token generálásakor.",
    });
  }
}
