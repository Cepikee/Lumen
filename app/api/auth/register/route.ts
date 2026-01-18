import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

function generateRandomAvatar() {
  const styles = ["bottts", "adventurer", "micah"];
  const style = styles[Math.floor(Math.random() * styles.length)];

  const seed = `utom_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;

  return {
    avatar_style: style,
    avatar_seed: seed,
    avatar_format: "svg" as const,
  };
}

export async function POST(req: Request) {
  const { email, password, pin, nickname, bio } = await req.json();

  // --- VALIDÁCIÓK ---

  if (!email || !password || !pin || !nickname) {
    return NextResponse.json({
      success: false,
      message: "Minden mező kötelező.",
    });
  }

  // Email formátum
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({
      success: false,
      message: "Érvénytelen email cím.",
    });
  }

  // Nickname validáció (Reddit-szerű)
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(nickname)) {
    return NextResponse.json({
      success: false,
      message:
        "A felhasználónév 3-20 karakter, csak betű, szám és _ lehet.",
    });
  }

  // PIN validáció
  if (!/^[0-9]{4}$/.test(pin)) {
    return NextResponse.json({
      success: false,
      message: "A PIN 4 számjegyből álljon.",
    });
  }

  // Jelszó minimális követelmény (frontend már erősebb)
  if (password.length < 8) {
    return NextResponse.json({
      success: false,
      message: "A jelszónak legalább 8 karakter hosszúnak kell lennie.",
    });
  }

  // --- DUPLIKÁCIÓ ELLENŐRZÉS ---

  const [emailCheck]: any = await db.query(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  if (emailCheck.length > 0) {
    return NextResponse.json({
      success: false,
      message: "Ez az email már regisztrálva van.",
    });
  }

  const [nickCheck]: any = await db.query(
    "SELECT id FROM users WHERE nickname = ? LIMIT 1",
    [nickname]
  );

  if (nickCheck.length > 0) {
    return NextResponse.json({
      success: false,
      message: "Ez a felhasználónév már foglalt.",
    });
  }

  // --- USER LÉTREHOZÁSA ---

  const password_hash = await bcrypt.hash(password, 10);
  const avatar = generateRandomAvatar();

  const [result]: any = await db.query(
    `INSERT INTO users 
      (email, password_hash, pin_code, nickname, created_at, email_verified, last_login, role, theme, bio, is_premium, premium_until, premium_tier,
       avatar_style, avatar_seed, avatar_format)
     VALUES (?, ?, ?, ?, NOW(), 0, NULL, 'user', 'system', ?, 0, NULL, NULL,
       ?, ?, ?)`,
    [
      email,
      password_hash,
      pin,
      nickname,
      bio || null,
      avatar.avatar_style,
      avatar.avatar_seed,
      avatar.avatar_format,
    ]
  );

  const userId = result.insertId;

  // --- 🔥 EMAIL MEGERŐSÍTÉS INDÍTÁSA (HOZZÁADOTT RÉSZ) ---
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/send-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  // --- SESSION COOKIE ---

  const response = NextResponse.json({
    success: true,
    message: "Sikeres regisztráció!",
  });

  response.cookies.set("session_user", String(userId), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 nap
  });

  return response;
}
