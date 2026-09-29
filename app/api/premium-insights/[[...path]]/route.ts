import { NextResponse } from "next/server";
import { getCurrentPremiumEntitlement } from "@/lib/entitlements";
import { normalizeInsightsPath } from "@/lib/premium-insights-path";
import { db } from "@/lib/db";
import { consumeRateLimitFailClosed } from "@/lib/shared-rate-limit";

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

async function readBoundedBody(response: Response, maximumBytes: number): Promise<ArrayBuffer> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maximumBytes) throw new Error("upstream_response_too_large");
  if (!response.body) return new ArrayBuffer(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximumBytes) throw new Error("upstream_response_too_large");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result.buffer as ArrayBuffer;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  const entitlement = await getCurrentPremiumEntitlement();
  if (entitlement.reason === "not_authenticated") {
    return NextResponse.json({ success: false, error: "not_authenticated" }, { status: 401 });
  }
  if (!entitlement.active) {
    return NextResponse.json({ success: false, error: "premium_required", reason: entitlement.reason }, { status: 403 });
  }
  const allowed = await consumeRateLimitFailClosed(db, {
    scope: "premium-insights-proxy",
    identity: `user-${entitlement.userId}`,
    limit: 60,
    windowMs: 10_000,
  });
  if (!allowed) return NextResponse.json({ success: false, error: "rate_limit" }, { status: 429 });

  const path = normalizeInsightsPath((await context.params).path);
  if (path === null) {
    return NextResponse.json({ success: false, error: "unsupported_insights_path" }, { status: 404 });
  }

  const apiKey = process.env.UTOM_API_KEY;
  if (!apiKey || apiKey.length < 32) {
    return NextResponse.json({ success: false, error: "insights_unavailable" }, { status: 503 });
  }

  const baseValue = process.env.UTOM_INTERNAL_BASE_URL || "http://127.0.0.1:3000";
  let base: URL;
  try {
    base = new URL(baseValue);
  } catch {
    return NextResponse.json({ success: false, error: "invalid_internal_base_url" }, { status: 503 });
  }
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
    return NextResponse.json({ success: false, error: "invalid_internal_base_url" }, { status: 503 });
  }
  if (base.pathname !== "/" || base.search || base.hash) {
    return NextResponse.json({ success: false, error: "invalid_internal_base_url" }, { status: 503 });
  }

  const incoming = new URL(request.url);
  const target = new URL(`/api/insights${path ? `/${path.split('/').map(encodeURIComponent).join('/')}` : ""}`, base);
  target.search = incoming.search;

  try {
    const upstream = await fetch(target, {
      method: "GET",
      redirect: "error",
      cache: "no-store",
      headers: {
        "x-api-key": apiKey,
        "x-utom-rate-key": `premium-user-${entitlement.userId}`,
        accept: request.headers.get("accept") || "application/json",
      },
      signal: AbortSignal.timeout(boundedInteger(process.env.UTOM_INTERNAL_PROXY_TIMEOUT_MS, 15_000, 100, 15_000)),
    });
    const body = await readBoundedBody(upstream, boundedInteger(process.env.UTOM_INTERNAL_PROXY_MAX_BYTES, 2 * 1024 * 1024, 1024, 2 * 1024 * 1024));
    return new Response(body, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ success: false, error: "insights_upstream_unavailable" }, { status: 502 });
  }
}
