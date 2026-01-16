import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// IP kinyerése reverse proxy mögül
function getIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}

export async function POST(req: Request) {
  const ip = getIp(req);
  const { email, password, pin } = await req.json();

  // 1) RATE LIMIT: 10 próbálkozás / 15 perc / IP
  const [attempts]: any = await db.query(
    `SELECT COUNT(*) AS cnt 
     FROM login_attempts 
     WHERE ip = ?
       AND created_at > (NOW() - INTERVAL 15 MINUTE)`,
    [ip]
  );

  if (attempts[0].cnt >= 10) {
    // logoljuk a blokkolt próbálkozást is
    await db.query(
      "INSERT INTO login_attempts (ip, email, success) VALUES (?, ?, 0)",
      [ip, email]
    );

    return NextResponse.json({
      success: false,
      message: "Túl sok próbálkozás. Próbáld újra később."
    });
  }

  // 2) USER LEKÉRÉSE
  const [rows]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  if (rows.length === 0) {
    await db.query(
      "INSERT INTO login_attempts (ip, email, success) VALUES (?, ?, 0)",
      [ip, email]
    );

    return NextResponse.json({
      success: false,
      message: "Nincs ilyen felhasználó"
    });
  }

  const user = rows[0];

  // 3) JELSZÓ ELLENŐRZÉS
  const validPass = await bcrypt.compare(password, user.password_hash);
  if (!validPass) {
    await db.query(
      "INSERT INTO login_attempts (ip, email, success) VALUES (?, ?, 0)",
      [ip, email]
    );

    return NextResponse.json({
      success: false,
      message: "Hibás jelszó"
    });
  }

  // 4) PIN ELLENŐRZÉS
  if (user.pin_code !== pin) {
    await db.query(
      "INSERT INTO login_attempts (ip, email, success) VALUES (?, ?, 0)",
      [ip, email]
    );

    return NextResponse.json({
      success: false,
      message: "Hibás PIN"
    });
  }

  // 5) SIKERES LOGIN LOGOLÁSA
  await db.query(
    "INSERT INTO login_attempts (ip, email, success) VALUES (?, ?, 1)",
    [ip, email]
  );

  // 6) SESSION COOKIE LÉTREHOZÁSA
  const response = NextResponse.json({ success: true });

  response.cookies.set("session_user", String(user.id), {
    httpOnly: true,
    secure: true, // élesben true
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7 // 7 nap
  });

  return response;
}
