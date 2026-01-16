import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { mailer } from "@/lib/mailer";

// IP kinyerése reverse proxy mögül
function getIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}

export async function POST(req: Request) {
  try {
    const ip = getIp(req);
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" });
    }

    // 1) RATE LIMIT: max 5 kérés / 30 perc / IP
    const [ipRows]: any = await db.query(
      `SELECT COUNT(*) AS cnt
       FROM password_reset_requests
       WHERE ip = ?
         AND created_at > (NOW() - INTERVAL 30 MINUTE)`,
      [ip]
    );

    if (ipRows[0].cnt >= 5) {
      // logoljuk a blokkolt kérést is
      await db.query(
        "INSERT INTO password_reset_requests (ip, email) VALUES (?, ?)",
        [ip, email]
      );

      // mindig success, hogy ne áruljunk el semmit
      return NextResponse.json({ success: true });
    }

    // 2) EMAIL ALAPÚ LIMIT: max 3 reset / 30 perc / email
    const [emailRows]: any = await db.query(
      `SELECT COUNT(*) AS cnt
       FROM password_reset_requests
       WHERE email = ?
         AND created_at > (NOW() - INTERVAL 30 MINUTE)`,
      [email]
    );

    if (emailRows[0].cnt >= 3) {
      await db.query(
        "INSERT INTO password_reset_requests (ip, email) VALUES (?, ?)",
        [ip, email]
      );

      return NextResponse.json({ success: true });
    }

    // 3) Logoljuk a kérést
    await db.query(
      "INSERT INTO password_reset_requests (ip, email) VALUES (?, ?)",
      [ip, email]
    );

    // 4) Felhasználó keresése
    const [users]: any = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (!users || users.length === 0) {
      // Biztonsági okból akkor is success
      return NextResponse.json({ success: true });
    }

    const userId = users[0].id;

    // 5) Token generálása
    const token = crypto.randomBytes(32).toString("hex");

    // 6) Token mentése (15 perc lejárat)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15);

    await db.query(
      "INSERT INTO password_reset_tokens (userId, token, expiresAt) VALUES (?, ?, ?)",
      [userId, token, expiresAt]
    );

    // 7) Reset link összeállítása
    const resetUrl = `https://utom.hu/reset-password?token=${token}`;

    // 8) Email küldése
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
