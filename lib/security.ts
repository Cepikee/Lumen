// lib/security.ts
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "./db";
import { consumeRateLimitFailClosed } from "./shared-rate-limit";

// 🔐 IP extraction (Cloudflare + Vercel + fallback)
export function getIp(req: Request): string {
  if (process.env.UTOM_TRUST_PROXY_HEADERS !== "true") return "direct";
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
  if (!headerKey) return false;
  const expected = Buffer.from(serverKey, "utf8");
  const supplied = Buffer.from(headerKey, "utf8");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

// 🔐 CORS check
export function checkCors(req: Request): boolean {
  const allowed = (process.env.UTOM_ALLOWED_ORIGIN || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!allowed.length) return process.env.NODE_ENV !== "production";

  const origin = req.headers.get("origin");
  if (!origin) return true;

  return allowed.includes(origin);
}

export function requireTrustedOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get("origin");
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });
  }
  if (!origin && process.env.NODE_ENV !== "production") return null;
  if (!origin || !checkCors(req)) {
    return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });
  }
  return null;
}

// 🔐 Rate limit (IP alapú)
export async function checkRateLimit(ip: string, limit = 60, windowMs = 10_000) {
  const accepted = await consumeRateLimitFailClosed(db, { scope: "insights", identity: ip, limit, windowMs });
  if (!accepted) console.warn("rate_limit_rejected_or_backend_unavailable");
  return accepted;
}

// 🔐 Közös security wrapper
export function isAllowedSameOriginRead(req: Request, options: { allowSameOriginRead?: boolean } = {}): boolean {
  // A browser read exception is deliberately narrow: GET only, an explicit
  // same-origin fetch signal. Origin is optional for browser GETs because
  // Chrome does not guarantee it; when present it must match. Referer, when
  // present, is an additional same-origin defense-in-depth check.
  const origin = req.headers.get("origin");
  const requestOrigin = (() => {
    try { return new URL(req.url).origin; } catch { return ""; }
  })();
  const configuredOrigins = (process.env.UTOM_ALLOWED_ORIGIN || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const originMatchesRequest = origin === null
    || origin === requestOrigin
    || configuredOrigins.includes(origin);
  const referer = req.headers.get("referer");
  const refererMatchesRequest = (() => {
    if (!referer) return true;
    try {
      const refererOrigin = new URL(referer).origin;
      return refererOrigin === requestOrigin || configuredOrigins.includes(refererOrigin);
    } catch {
      return false;
    }
  })();
  return options.allowSameOriginRead === true
    && req.method === "GET"
    && req.headers.get("sec-fetch-site") === "same-origin"
    && originMatchesRequest
    && refererMatchesRequest;
}

export async function securityCheck(req: Request, options: { allowSameOriginRead?: boolean } = {}) {
  // API key
  const sameOriginRead = isAllowedSameOriginRead(req, options);
  if (!checkApiKey(req) && !sameOriginRead) {
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
  const internalRateKey = req.headers.get("x-utom-rate-key");
  const ip = internalRateKey && /^premium-user-\d+$/.test(internalRateKey)
    ? internalRateKey
    : getIp(req);
  const ok = await checkRateLimit(ip);
  if (!ok) {
    return NextResponse.json(
      { success: false, error: "rate_limit" },
      { status: 429 }
    );
  }

  return null; // minden oké
}
