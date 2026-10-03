import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
import { isV2Enabled } from "@/lib/v2/feature-flags";
import { encodeCursor, envelope, errorEnvelope } from "@/lib/v2/read-model-contract";
import { readTimelineItems } from "@/lib/v2/temporal-graph-repository";

export async function GET(req: Request, context: { params: Promise<{ ownerType: string; ownerId: string }> | { ownerType: string; ownerId: string } }) {
  const security = await securityCheck(req);
  if (security) return security;
  if (!isV2Enabled()) return NextResponse.json(errorEnvelope("v2_disabled", "V2 read models are disabled"), { status: 404 });
  const params = context?.params instanceof Promise ? await context.params : context?.params;
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") || 50);
  let cursor = null;
  if (url.searchParams.get("cursor")) {
    try { cursor = JSON.parse(Buffer.from(String(url.searchParams.get("cursor")), "base64url").toString("utf8")); } catch { return NextResponse.json(errorEnvelope("invalid_input", "cursor_invalid"), { status: 422 }); }
  }
  try {
    const result = await readTimelineItems(db, { ownerType: String(params?.ownerType || ""), ownerId: String(params?.ownerId || ""), asOf: url.searchParams.get("asOf") || new Date().toISOString(), limit, cursor, visibility: "public" });
    return NextResponse.json(envelope({ items: result.items, nextCursor: encodeCursor(result.nextCursor) }, { asOf: url.searchParams.get("asOf") || new Date().toISOString(), limit }));
  } catch (error: any) {
    const code = String(error?.message || "").endsWith("_invalid") ? "invalid_input" : "internal_error";
    return NextResponse.json(errorEnvelope(code, code === "invalid_input" ? error.message : "Unable to load timeline"), { status: code === "invalid_input" ? 422 : 500 });
  }
}
