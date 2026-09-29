import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { getIp } from "@/lib/security";
import { consumeRateLimitFailClosed } from "@/lib/shared-rate-limit";
import { requestReset } from "@/lib/reset-service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    if (await verifyRecaptcha(body.recaptchaToken) < 0.5) return NextResponse.json({ success: true });
    const ip = getIp(req);
    const [ipAllowed, emailAllowed] = await Promise.all([
      consumeRateLimitFailClosed(db, { scope: "password-reset-ip", identity: ip, limit: 5, windowMs: 30 * 60_000 }),
      consumeRateLimitFailClosed(db, { scope: "password-reset-email", identity: email, limit: 3, windowMs: 30 * 60_000 }),
    ]);
    if (!ipAllowed || !emailAllowed) return NextResponse.json({ success: true });
    await requestReset(db, { kind: "password", email, ip, baseUrl: process.env.PUBLIC_APP_URL || "https://utom.hu" });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "A kérés feldolgozása sikertelen." }, { status: 500 });
  }
}