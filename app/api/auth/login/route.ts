import { createSession } from "@/lib/auth-session";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { hashPin, verifyPin } from "@/lib/pin-security";
import { getIp } from "@/lib/security";
import { getLoginAttemptScope } from "@/lib/login-rate-limit";

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
      }, { status: 400 });
    }

    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
    const rememberMe = body?.rememberMe === true;
    if (!email || !password || !pin) {
      return NextResponse.json({ success: false, message: "Érvénytelen bejelentkezési adatok." }, { status: 400 });
    }

    const attemptScope = getLoginAttemptScope(ip, email);
    const [attempts]: any = await db.query(
      `SELECT COUNT(*) AS cnt
       FROM login_attempts
       WHERE ${attemptScope.where}
         AND success = 0
         AND created_at > (NOW() - INTERVAL 15 MINUTE)`,
      attemptScope.params,
    );

    if (attempts[0].cnt >= 10) {
      await db.query(
        "INSERT INTO login_attempts (ip, email, success) VALUES (?, ?, 0)",
        [ip, email]
      );

      return NextResponse.json({
        success: false,
        message: "Túl sok próbálkozás. Próbáld újra később.",
      }, { status: 429 });
    }

    const connection = await db.getConnection();
    let user: any;
    try {
      await connection.beginTransaction();
      const [rows]: any = await connection.query(
        "SELECT * FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
        [email]
      );

      if (rows.length === 0) {
        await connection.query("INSERT INTO login_attempts (ip, email, success) VALUES (?, ?, 0)", [ip, email]);
        await connection.commit();
        return NextResponse.json({ success: false, message: "Nincs ilyen felhasználó" }, { status: 401 });
      }

      user = rows[0];
      const validPass = typeof password === "string" && await bcrypt.compare(password, user.password_hash);
      const pinResult = validPass ? await verifyPin(pin, user.pin_code) : { valid: false, needsUpgrade: false };
      if (!validPass || !pinResult.valid) {
        await connection.query("INSERT INTO login_attempts (ip, email, success) VALUES (?, ?, 0)", [ip, email]);
        await connection.commit();
        return NextResponse.json({ success: false, message: "Hibás bejelentkezési adatok" }, { status: 401 });
      }

      if (pinResult.needsUpgrade) {
        await connection.query("UPDATE users SET pin_code = ? WHERE id = ? AND pin_code = ?", [await hashPin(pin), user.id, user.pin_code]);
      }
      await connection.query("INSERT INTO login_attempts (ip, email, success) VALUES (?, ?, 1)", [ip, email]);
      await connection.query("UPDATE users SET last_login = NOW(), last_ip = ? WHERE id = ?", [ip, user.id]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

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

    await createSession(Number(user.id), response, Boolean(rememberMe));

    return response;
  } catch {
    return NextResponse.json({
      success: false,
      message: "Váratlan hiba történt.",
    }, { status: 500 });
  }
}
