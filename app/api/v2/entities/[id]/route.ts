import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
import { isV2Enabled } from "@/lib/v2/feature-flags";
import { encodeCursor, envelope, errorEnvelope } from "@/lib/v2/read-model-contract";
import { getEntity } from "@/lib/v2/read-model-repository";
export async function GET(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const security = await securityCheck(req); if (security) return security;
  if (!isV2Enabled()) return NextResponse.json(errorEnvelope("v2_disabled", "V2 read models are disabled"), { status: 404 });
  const params = context?.params instanceof Promise ? await context.params : context?.params; const url = new URL(req.url);
  try { const data: any = await getEntity(db, String(params?.id || ""), { asOf: url.searchParams.get("asOf") || undefined, limit: Number(url.searchParams.get("limit") || 20), cursor: url.searchParams.get("cursor") ? JSON.parse(Buffer.from(String(url.searchParams.get("cursor")), "base64url").toString("utf8")) : null }); if (!data) return NextResponse.json(errorEnvelope("not_found", "Entity not found"), { status: 404 }); data.timeline.nextCursor = encodeCursor(data.timeline.nextCursor); return NextResponse.json(envelope(data)); }
  catch (error: any) { const invalid = String(error?.message || "").endsWith("_invalid") || error?.message === "cursor_invalid"; return NextResponse.json(errorEnvelope(invalid ? "invalid_input" : "internal_error", invalid ? error.message : "Unable to load entity"), { status: invalid ? 422 : 500 }); }
}
