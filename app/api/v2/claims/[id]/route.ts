import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
import { isV2Enabled } from "@/lib/v2/feature-flags";
import { envelope, errorEnvelope } from "@/lib/v2/read-model-contract";
import { getClaim } from "@/lib/v2/read-model-repository";
export async function GET(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) { const security = await securityCheck(req); if (security) return security; if (!isV2Enabled()) return NextResponse.json(errorEnvelope("v2_disabled", "V2 read models are disabled"), { status: 404 }); const params = context?.params instanceof Promise ? await context.params : context?.params; const url = new URL(req.url); try { const data = await getClaim(db, String(params?.id || ""), { asOf: url.searchParams.get("asOf") || undefined }); if (!data) return NextResponse.json(errorEnvelope("not_found", "Claim not found"), { status: 404 }); return NextResponse.json(envelope(data)); } catch (error: any) { const invalid = String(error?.message || "").endsWith("_invalid"); return NextResponse.json(errorEnvelope(invalid ? "invalid_input" : "internal_error", invalid ? error.message : "Unable to load claim"), { status: invalid ? 422 : 500 }); } }
