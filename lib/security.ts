// lib/security.ts
import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { db } from "./db";
import { consumeRateLimitFailClosed } from "./shared-rate-limit";

function normalizeIp(value: string | null): string | null {
  const candidate = String(value || "").trim();
  if (!candidate || candidate.length > 64) return null;
  return isIP(candidate) ? candidate.toLowerCase() : null;
}

// 🔐 IP extraction (Cloudflare + reverse-proxy fallback). Proxy headers are
// considered only when the deployment explicitly opts in, and malformed
// caller-controlled values are never accepted as rate-limit identities.
export function getIp(req: Request): string {
  if (process.env.UTOM_TRUST_PROXY_HEADERS !== "true") return "direct";

  const cf = normalizeIp(req.headers.get("cf-connecting-ip"));
  if (cf) return cf;

  const real = normalizeIp(req.headers.get("x-real-ip"));
  if (real) return real;

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = normalizeIp(forwarded.split(",")[0]);
    if (first) return first;
  }

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

export async function checkPublicApiRateLimit(
  req: Request,
  scope: string,
  limit = 120,
  windowMs = 60_000,
): Promise<boolean> {
  const ip = getIp(req);
  // Without a trusted reverse-proxy address every visitor would collapse into
  // the same bucket ("direct"). In that deployment mode query-shape bounds
  // still apply, but the shared IP limiter is intentionally skipped.
  if (ip === "direct" || ip === "unknown") return true;
  return consumeRateLimitFailClosed(db, {
    scope: `public:${scope}`,
    identity: ip,
    limit,
    windowMs,
  });
}

// 🔐 Közös security wrapper
export function isAllowedSameOriginRead(req: Request, options: { allowSameOriginRead?: boolean } = {}): boolean {
  // A browser read exception is deliberately narrow: GET only, an explicit
  // same-origin fetch signal. Some embedded Chromium transports omit
  // Sec-Fetch-Site, so a missing value is accepted only when Origin or Referer
  // independently proves that the request came from this origin. Origin is
  // optional for browser GETs because Chrome does not guarantee it; when
  // present it must match. Referer, when present, is an additional same-origin
  // defense-in-depth check.
  const origin = req.headers.get("origin");
  const requestOrigin = (() => {
    try { return new URL(req.url).origin; } catch { return ""; }
  })();
  const sameOrigin = (candidate: string | null, expected: string): boolean => {
    if (candidate === null) return true;
    if (candidate === expected) return true;
    try {
      const actualUrl = new URL(candidate);
      const expectedUrl = new URL(expected);
      const loopback = new Set(["127.0.0.1", "localhost", "::1"]);
      return loopback.has(actualUrl.hostname)
        && loopback.has(expectedUrl.hostname)
        && actualUrl.protocol === expectedUrl.protocol
        && actualUrl.port === expectedUrl.port;
    } catch {
      return false;
    }
  };
  const configuredOrigins = (process.env.UTOM_ALLOWED_ORIGIN || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const originMatchesRequest = sameOrigin(origin, requestOrigin)
    || (origin !== null && configuredOrigins.includes(origin));
  const referer = req.headers.get("referer");
  const refererMatchesRequest = (() => {
    if (!referer) return true;
    try {
      const refererOrigin = new URL(referer).origin;
      return sameOrigin(refererOrigin, requestOrigin) || configuredOrigins.includes(refererOrigin);
    } catch {
      return false;
    }
  })();
  const fetchMetadataMatches = req.headers.get("sec-fetch-site") === "same-origin"
    || (req.headers.get("sec-fetch-site") === null
      && (origin !== null || referer !== null)
      && originMatchesRequest
      && refererMatchesRequest);
  return options.allowSameOriginRead === true
    && req.method === "GET"
    && fetchMetadataMatches
    && originMatchesRequest
    && refererMatchesRequest;
}

export async function securityCheck(req: Request, options: { allowSameOriginRead?: boolean } = {}) {
  const apiKeyAccepted = checkApiKey(req);
  const sameOriginRead = isAllowedSameOriginRead(req, options);

  // `allowSameOriginRead` is an explicit public-browser read exception, not an
  // authentication primitive. Browser metadata headers can be reproduced by a
  // non-browser HTTP client, so confidential data must still have its own
  // session/entitlement check in the route itself.
  if (!apiKeyAccepted && !sameOriginRead) {
    return NextResponse.json(
      { success: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  if (!checkCors(req)) {
    return NextResponse.json(
      { success: false, error: "forbidden_origin" },
      { status: 403 }
    );
  }

  let ok: boolean;
  if (apiKeyAccepted) {
    // Caller-controlled rate identities are trusted only after the internal
    // API key has authenticated the request. This prevents public callers from
    // rotating x-utom-rate-key values to bypass throttling.
    const internalRateKey = req.headers.get("x-utom-rate-key");
    const identity = internalRateKey && /^premium-user-\d+$/.test(internalRateKey)
      ? internalRateKey
      : "internal-api-key";
    ok = await checkRateLimit(identity);
  } else {
    ok = await checkPublicApiRateLimit(req, "v2-browser-read", 120, 60_000);
  }

  if (!ok) {
    return NextResponse.json(
      { success: false, error: "rate_limit" },
      { status: 429 }
    );
  }

  return null;
}
