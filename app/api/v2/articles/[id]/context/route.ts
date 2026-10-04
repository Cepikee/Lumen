import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
import { isV2Enabled } from "@/lib/v2/feature-flags";
import { asOf, envelope, errorEnvelope, projectArticleContext, validateReadInput } from "@/lib/v2/read-model-contract";

export async function GET(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const security = await securityCheck(req, { allowSameOriginRead: true });
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
    const [eventRows] = await db.query(`SELECT DISTINCT e.id,e.canonical_title title
      FROM v2_event_articles ea JOIN v2_events e ON e.id=ea.event_id
      WHERE ea.article_id=? AND e.status NOT IN ('archived','retracted','expired','superseded')
      ORDER BY e.canonical_title ASC,e.id ASC LIMIT 20`, [input.id]);
    const data = { article: projectArticleContext(row, { id: row.summary_id, text: summaryText } as any), asOf: asOf(input.asOf), entities: [], claims: [], events: (eventRows as any[]).map((event) => ({ id: Number(event.id), title: typeof event.title === "string" && event.title.trim() ? event.title.trim() : null })), timeline: [], partial: true };
    return NextResponse.json(envelope(data));
  } catch (error) {
    console.error("V2 article context error:", error);
    return NextResponse.json(errorEnvelope("internal_error", "Unable to load article context"), { status: 500 });
  }
}
