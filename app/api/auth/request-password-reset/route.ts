import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { mailer } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" });
    }

    // 1) Felhasználó keresése
    const [users]: any = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (!users || users.length === 0) {
      // Biztonsági okból akkor is success
      return NextResponse.json({ success: true });
    }

    const userId = users[0].id;

    // 2) Token generálása
    const token = crypto.randomBytes(32).toString("hex");

    // 3) Token mentése (15 perc lejárat)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15);

    await db.query(
      "INSERT INTO password_reset_tokens (userId, token, expiresAt) VALUES (?, ?, ?)",
      [userId, token, expiresAt]
    );

    // 4) Reset link összeállítása
    const resetUrl = `https://utom.hu/reset-password?token=${token}`;

    // 5) Email küldése
    await mailer.sendMail({
      from: `"Utom.hu" <noreply@utom.hu>`,
      to: email,
      subject: "Jelszó visszaállítása",
      text: `A jelszó visszaállításához kattints ide: ${resetUrl}`,
      html: `
        <p>Szia!</p>
        <p>A jelszó visszaállításához kattints az alábbi linkre:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Ez a link 15 percig érvényes.</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
