import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

function getIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}

export async function POST(req: Request) {
  try {
    const ip = getIp(req);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({
        success: false,
        message: "Érvénytelen kérés.",
      });
    }

    const { email, password, pin, rememberMe } = body;

    const [attempts]: any = await db.query(
      `SELECT COUNT(*) AS cnt 
       FROM login_attempts 
       WHERE ip = ?
         AND created_at > (NOW() - INTERVAL 15 MINUTE)`,
      [ip]
    );

    if (attempts[0].cnt >= 10) {
      await db.query(
        "INSERT INTO login_attempts (ip, email, success) VALUES (?, ?, 0)",
        [ip, email]
      );

      return NextResponse.json({
        success: false,
        message: "Túl sok próbálkozás. Próbáld újra később.",
      });
    }

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
        message: "Nincs ilyen felhasználó",
      });
    }

    const user = rows[0];

    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) {
      await db.query(
        "INSERT INTO login_attempts (ip, email, success) VALUES (?, ?, 0)",
        [ip, email]
      );

      return NextResponse.json({
        success: false,
        message: "Hibás jelszó",
      });
    }

    if (user.pin_code !== pin) {
      await db.query(
        "INSERT INTO login_attempts (ip, email, success) VALUES (?, ?, 0)",
        [ip, email]
      );

      return NextResponse.json({
        success: false,
        message: "Hibás PIN",
      });
    }

    await db.query(
      "INSERT INTO login_attempts (ip, email, success) VALUES (?, ?, 1)",
      [ip, email]
    );

    await db.query("UPDATE users SET last_login = NOW() WHERE id = ?", [
      user.id,
    ]);

    // 🔐 IP + session kötés — ITT MENTJÜK EL A USER IP-JÉT
    await db.query("UPDATE users SET last_ip = ? WHERE id = ?", [
      ip,
      user.id,
    ]);

    const maxAge = rememberMe
      ? 60 * 60 * 24 * 30
      : 60 * 60 * 24;

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        bio: user.bio,
        is_premium: user.is_premium,
        premium_until: user.premium_until,
        premium_tier: user.premium_tier,
      },
    });

    response.cookies.set("session_user", String(user.id), {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge,
    });

    return response;
  } catch {
    return NextResponse.json({
      success: false,
      message: "Váratlan hiba történt.",
    });
  }
}
