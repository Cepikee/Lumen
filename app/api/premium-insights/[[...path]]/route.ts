import { NextResponse } from "next/server";
import { getCurrentPremiumEntitlement } from "@/lib/entitlements";
import { normalizeInsightsPath } from "@/lib/premium-insights-path";

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
      signal: AbortSignal.timeout(15_000),
    });
    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ success: false, error: "insights_upstream_unavailable" }, { status: 502 });
  }
}
