import { createSession } from "@/lib/auth-session";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPin, verifyPinWithTimingPadding } from "@/lib/pin-security";
import { hashPassword, passwordNeedsRehash, verifyPasswordWithTimingPadding } from "@/lib/password-security";
import { getIp, requireTrustedOrigin } from "@/lib/security";
import { getLoginAttemptScope } from "@/lib/login-rate-limit";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { consumeRateLimitFailClosed } from "@/lib/shared-rate-limit";
import { readJsonBodyWithLimit } from "@/lib/request-body";

export async function POST(req: Request) {
  try {
    const originDenied = requireTrustedOrigin(req);
    if (originDenied) return originDenied;

    const ip = getIp(req);

    const parsedBody = await readJsonBodyWithLimit(req, 20_000);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { success: false, message: parsedBody.status === 413 ? "Túl nagy kérés." : "Érvénytelen kérés." },
        { status: parsedBody.status },
      );
    }
    const body: any = parsedBody.value;

    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
    const rememberMe = body?.rememberMe === true;
    const recaptchaToken = typeof body?.recaptchaToken === "string" ? body.recaptchaToken : "";
    if (!email || !password || !pin || email.length > 254) {
      return NextResponse.json({ success: false, message: "Érvénytelen bejelentkezési adatok." }, { status: 400 });
    }

    // A coarse trusted-IP gate may run before CAPTCHA to absorb floods without
    // allowing an attacker to burn another user's account-specific quota.
    const ipGate = (ip === "direct" || ip === "unknown")
      ? true
      : await consumeRateLimitFailClosed(db, {
          scope: "login-ip-request",
          identity: ip,
          limit: 60,
          windowMs: 15 * 60_000,
        });
    if (!ipGate) {
      return NextResponse.json({
        success: false,
        message: "Túl sok próbálkozás. Próbáld újra később.",
      }, { status: 429 });
    }

    const captchaScore = await verifyRecaptcha(recaptchaToken, { expectedAction: "login" });
    if (captchaScore < 0.5) {
      return NextResponse.json({
        success: false,
        message: "A botvédelem ellenőrzése sikertelen.",
      }, { status: 400 });
    }

    const accountGate = await consumeRateLimitFailClosed(db, {
      scope: "login-account-request",
      identity: email,
      limit: 30,
      windowMs: 15 * 60_000,
    });
    if (!accountGate) {
      return NextResponse.json({
        success: false,
        message: "Túl sok próbálkozás. Próbáld újra később.",
      }, { status: 429 });
    }

    const [accountFailures]: any = await db.query(
      `SELECT COUNT(*) AS cnt
       FROM login_attempts
       WHERE email = ?
         AND success = 0
         AND created_at > (NOW() - INTERVAL 30 MINUTE)`,
      [email],
    );
    if (Number(accountFailures[0]?.cnt || 0) >= 15) {
      return NextResponse.json({
        success: false,
        message: "Túl sok próbálkozás. Próbáld újra később.",
      }, { status: 429 });
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
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [email]
      );

      user = rows[0] || null;

      // Always execute both credential stages. Missing accounts and the historic
      // bcrypt cost-10/cost-12 password rows receive matching padding work, and
      // PIN verification is never skipped after a wrong password. This removes
      // the practical "password is already correct" timing oracle.
      const validPass = await verifyPasswordWithTimingPadding(password, user?.password_hash);
      const pinResult = await verifyPinWithTimingPadding(pin, user?.pin_code);

      if (!user || !validPass || !pinResult.valid) {
        await connection.query("INSERT INTO login_attempts (ip, email, success) VALUES (?, ?, 0)", [ip, email]);
        await connection.commit();
        return NextResponse.json({ success: false, message: "Hibás bejelentkezési adatok" }, { status: 401 });
      }

      if (pinResult.needsUpgrade) {
        await connection.query("UPDATE users SET pin_code = ? WHERE id = ? AND pin_code = ?", [await hashPin(pin), user.id, user.pin_code]);
      }
      if (passwordNeedsRehash(user.password_hash)) {
        await connection.query("UPDATE users SET password_hash = ? WHERE id = ? AND password_hash = ?", [await hashPassword(password), user.id, user.password_hash]);
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
