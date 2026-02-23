// lib/security.ts
import { NextResponse } from "next/server";

// 🔐 In-memory rate limit bucket (IP → timestamps)
const rateBuckets = new Map<string, number[]>();

// 🔐 IP extraction (Cloudflare + Vercel + fallback)
export function getIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf;

  const real = req.headers.get("x-real-ip");
  if (real) return real;

  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();

  return "unknown";
}

// 🔐 API key check
export function checkApiKey(req: Request): boolean {
  const headerKey = req.headers.get("x-api-key");
  const serverKey = process.env.UTOM_API_KEY;
  if (!serverKey) {
    console.warn("⚠️ UTOM_API_KEY nincs beállítva!");
    return false;
  }
  return headerKey === serverKey;
}

// 🔐 CORS check
export function checkCors(req: Request): boolean {
  const allowed = process.env.UTOM_ALLOWED_ORIGIN; // pl. https://utom.hu
  if (!allowed) return true;

  const origin = req.headers.get("origin");
  if (!origin) return true;

  return origin === allowed;
}

// 🔐 Rate limit (IP alapú)
export function checkRateLimit(ip: string, limit = 60, windowMs = 10_000) {
  const now = Date.now();
  let bucket = rateBuckets.get(ip) || [];

  bucket = bucket.filter((ts) => now - ts < windowMs);
  bucket.push(now);

  rateBuckets.set(ip, bucket);

  return bucket.length <= limit;
}

// 🔐 Közös security wrapper
export function securityCheck(req: Request) {
  // API key
  if (!checkApiKey(req)) {
    return NextResponse.json(
      { success: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  // CORS
  if (!checkCors(req)) {
    return NextResponse.json(
      { success: false, error: "forbidden_origin" },
      { status: 403 }
    );
  }

  // Rate limit
  const ip = getIp(req);
  const ok = checkRateLimit(ip);
  if (!ok) {
    return NextResponse.json(
      { success: false, error: "rate_limit" },
      { status: 429 }
    );
  }

  return null; // minden oké
}
