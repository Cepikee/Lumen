// app/api/sources/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkPublicApiRateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await checkPublicApiRateLimit(req, "sources", 120, 60_000))) {
    return NextResponse.json({ success: false, error: "rate_limit" }, { status: 429 });
  }
  try {
    // A forráslista nyilvános UI-adat; a canonical article→source FK-t
    // használjuk, hogy hiányzó/legacy summary.source mellett se vesszen el
    // aktív, ténylegesen használt forrás.
    const [rows]: any = await db.query(
      `
      SELECT DISTINCT s.id, s.name
      FROM sources s
      JOIN articles a ON a.source_id = s.id
      JOIN summaries su ON su.article_id = a.id
      WHERE s.is_active = 1
      ORDER BY s.name ASC
      `
    );

    return NextResponse.json(
      { success: true, sources: rows },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    );

  } catch (err) {
    console.error("API /sources error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
