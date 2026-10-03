import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
import { isV2Enabled } from "@/lib/v2/feature-flags";
import { asOf, envelope, errorEnvelope, projectArticleContext, validateReadInput } from "@/lib/v2/read-model-contract";

export async function GET(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const security = await securityCheck(req);
  if (security) return security;
  if (!isV2Enabled()) return NextResponse.json(errorEnvelope("v2_disabled", "V2 read models are disabled"), { status: 404 });
  const params = context?.params instanceof Promise ? await context.params : context?.params;
  const url = new URL(req.url);
  const validation: any = validateReadInput({ id: params?.id, asOf: url.searchParams.get("asOf") || undefined, limit: url.searchParams.get("limit") || undefined, cursor: url.searchParams.get("cursor") || undefined });
  if (validation.status !== "valid") return NextResponse.json(errorEnvelope("invalid_input", validation.errors.join(", ")), { status: 422 });
  const input = validation.result;
  try {
    const [rows] = await db.query(`SELECT a.id,a.title,a.source,a.category,a.published_at,s.id summary_id,s.summary_text,s.content
      FROM articles a LEFT JOIN summaries s ON s.article_id=a.id AND NOT EXISTS (SELECT 1 FROM summaries newer WHERE newer.article_id=s.article_id AND (newer.created_at>s.created_at OR (newer.created_at=s.created_at AND newer.id>s.id)))
      WHERE a.id=? LIMIT 1`, [input.id]);
    const row = (rows as any[])[0];
    if (!row) return NextResponse.json(errorEnvelope("not_found", "Article not found"), { status: 404 });
    const summaryText = row.summary_text ?? row.content ?? null;
    const data = { article: projectArticleContext(row, { id: row.summary_id, text: summaryText } as any), asOf: asOf(input.asOf), entities: [], claims: [], events: [], timeline: [], partial: true };
    return NextResponse.json(envelope(data));
  } catch (error) {
    console.error("V2 article context error:", error);
    return NextResponse.json(errorEnvelope("internal_error", "Unable to load article context"), { status: 500 });
  }
}
