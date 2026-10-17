import { createSession } from "@/lib/auth-session";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { validatePassword, validatePin } from "@/lib/auth-policy";
import { hashPin } from "@/lib/pin-security";
import { sendEmailVerification } from "@/lib/email-verification";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { getIp, requireTrustedOrigin } from "@/lib/security";
import { consumeRateLimitFailClosed } from "@/lib/shared-rate-limit";
import { readJsonBodyWithLimit } from "@/lib/request-body";

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
  try {
    const originDenied = requireTrustedOrigin(req);
    if (originDenied) return originDenied;

    const parsedBody = await readJsonBodyWithLimit(req, 50_000);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { success: false, message: parsedBody.status === 413 ? "Túl nagy kérés." : "Érvénytelen JSON kérés." },
        { status: parsedBody.status },
      );
    }
    const body: any = parsedBody.value;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: "Érvénytelen kérés törzs." }, { status: 400 });
    }

    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
    const nickname = typeof body?.nickname === "string" ? body.nickname.trim() : "";
    const bio = typeof body?.bio === "string" ? body.bio.trim() : "";
    const recaptchaToken = typeof body?.recaptchaToken === "string" ? body.recaptchaToken : "";

    if (!email || !password || !pin || !nickname) {
      return NextResponse.json({ success: false, message: "Minden mező kötelező." }, { status: 400 });
    }

    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, message: "Érvénytelen email cím." }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(nickname)) {
      return NextResponse.json({ success: false, message: "A felhasználónév 3-20 karakter, csak betű, szám és _ lehet." }, { status: 400 });
    }
    if (bio.length > 500) {
      return NextResponse.json({ success: false, message: "A bemutatkozás túl hosszú." }, { status: 400 });
    }
    if (!validatePin(pin)) {
      return NextResponse.json({ success: false, message: "A PIN 4 számjegyből álljon." }, { status: 400 });
    }
    const passwordPolicy = validatePassword(password);
    if (!passwordPolicy.valid) {
      return NextResponse.json({ success: false, message: passwordPolicy.message }, { status: 400 });
    }

    const ip = getIp(req);
    const ipAllowed = (ip === "direct" || ip === "unknown")
      ? true
      : await consumeRateLimitFailClosed(db, { scope: "register-ip", identity: ip, limit: 8, windowMs: 60 * 60_000 });
    if (!ipAllowed) {
      return NextResponse.json({ success: false, message: "Túl sok regisztrációs próbálkozás. Próbáld újra később." }, { status: 429 });
    }

    const captchaScore = await verifyRecaptcha(recaptchaToken, { expectedAction: "register" });
    if (captchaScore < 0.5) {
      return NextResponse.json({ success: false, message: "A botvédelem ellenőrzése sikertelen." }, { status: 400 });
    }

    const emailAllowed = await consumeRateLimitFailClosed(db, {
      scope: "register-email",
      identity: email,
      limit: 4,
      windowMs: 60 * 60_000,
    });
    if (!emailAllowed) {
      return NextResponse.json({ success: false, message: "Túl sok regisztrációs próbálkozás. Próbáld újra később." }, { status: 429 });
    }

    const [emailCheck]: any = await db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (emailCheck.length > 0) {
      return NextResponse.json({ success: false, message: "Ez az email már regisztrálva van." }, { status: 409 });
    }
    const [nickCheck]: any = await db.query("SELECT id FROM users WHERE nickname = ? LIMIT 1", [nickname]);
    if (nickCheck.length > 0) {
      return NextResponse.json({ success: false, message: "Ez a felhasználónév már foglalt." }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const avatar = generateRandomAvatar();
    const [result]: any = await db.query("INSERT INTO users SET ?", {
      email,
      password_hash,
      pin_code: await hashPin(pin),
      nickname,
      created_at: new Date(),
      email_verified: 0,
      last_login: null,
      role: "user",
      theme: "system",
      bio: bio || null,
      is_premium: 0,
      premium_until: null,
      premium_tier: null,
      avatar_style: avatar.avatar_style,
      avatar_seed: avatar.avatar_seed,
      avatar_format: avatar.avatar_format,
      avatar_frame: null,
    });

    const userId = Number(result.insertId);
    const response = NextResponse.json({ success: true, message: "Sikeres regisztráció!" });
    await createSession(userId, response, true);

    try {
      await sendEmailVerification(userId, email);
    } catch (error) {
      console.error("Verification email could not be sent:", error instanceof Error ? error.message : "unknown_error");
    }
    return response;
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ success: false, message: "Az email vagy felhasználónév már foglalt." }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: "Váratlan hiba történt." }, { status: 500 });
  }
}
