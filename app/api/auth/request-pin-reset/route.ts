import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { getIp, requireTrustedOrigin } from "@/lib/security";
import { consumeRateLimitFailClosed } from "@/lib/shared-rate-limit";
import { requestReset } from "@/lib/reset-service";
import { readJsonBodyWithLimit } from "@/lib/request-body";

export async function POST(req: Request) {
  try {
    const originDenied = requireTrustedOrigin(req);
    if (originDenied) return originDenied;

    const parsedBody = await readJsonBodyWithLimit(req, 16_000);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { success: false, error: parsedBody.status === 413 ? "Túl nagy kérés." : "Érvénytelen JSON kérés." },
        { status: parsedBody.status },
      );
    }
    const body: any = parsedBody.value;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: "Érvénytelen kérés törzs." }, { status: 400 });
    }
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || email.length > 254) return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    if (await verifyRecaptcha(body.recaptchaToken, { expectedAction: "forgot_pin" }) < 0.5) return NextResponse.json({ success: true });
    const ip = getIp(req);
    const [ipAllowed, emailAllowed] = await Promise.all([
      (ip === "direct" || ip === "unknown")
        ? Promise.resolve(true)
        : consumeRateLimitFailClosed(db, { scope: "pin-reset-ip", identity: ip, limit: 5, windowMs: 30 * 60_000 }),
      consumeRateLimitFailClosed(db, { scope: "pin-reset-email", identity: email, limit: 3, windowMs: 30 * 60_000 }),
    ]);
    if (!ipAllowed || !emailAllowed) return NextResponse.json({ success: true });
    await requestReset(db, { kind: "pin", email, ip, baseUrl: process.env.PUBLIC_APP_URL || "https://utom.hu" });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "A kérés feldolgozása sikertelen." }, { status: 500 });
  }
}
