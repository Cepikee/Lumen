// app/api/insights/clickbait-duplication/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
import { businessDayBounds, mysqlUtc } from "@/lib/business-time";

interface DuplicationRow {
  source: string;
  original: number;
  duplicate: number;
  duplicationScore: number;
}

export async function GET(req: Request) {
  try {
    const sec = await securityCheck(req);
    if (sec) return sec;

    const bounds = businessDayBounds(new Date());
    const startStr = mysqlUtc(bounds.start);

    const [rows]: any = await db.query(
      `
      SELECT 
        COALESCE(NULLIF(LOWER(TRIM(a.source)), ''), 'ismeretlen') AS source,
        SUM(COALESCE(NULLIF(LOWER(TRIM(a.source)), ''), 'ismeretlen') COLLATE utf8mb4_0900_ai_ci =
            COALESCE(NULLIF(LOWER(TRIM(c.first_source)), ''), 'ismeretlen') COLLATE utf8mb4_0900_ai_ci) AS original,
        SUM(COALESCE(NULLIF(LOWER(TRIM(a.source)), ''), 'ismeretlen') COLLATE utf8mb4_0900_ai_ci <>
            COALESCE(NULLIF(LOWER(TRIM(c.first_source)), ''), 'ismeretlen') COLLATE utf8mb4_0900_ai_ci) AS duplicate
      FROM articles a
      JOIN clusters c ON a.cluster_id = c.id
      WHERE c.first_published_at >= ? AND c.first_published_at < ?
      GROUP BY COALESCE(NULLIF(LOWER(TRIM(a.source)), ''), 'ismeretlen')
      `,
      [startStr, mysqlUtc(bounds.end)]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: true,
        duplication: [],
      });
    }

    const duplication: DuplicationRow[] = rows.map((r: any) => {
      const original = Number(r.original);
      const duplicate = Number(r.duplicate);
      const total = original + duplicate;

      return {
        source: String(r.source ?? "ismeretlen").trim().toLowerCase() || "ismeretlen",
        original,
        duplicate,
        duplicationScore:
          total === 0 ? 0 : Number(((duplicate / total) * 100).toFixed(1)),
      };
    });

    duplication.sort(
      (a: DuplicationRow, b: DuplicationRow) =>
        b.duplicationScore - a.duplicationScore || a.source.localeCompare(b.source)
    );

    return NextResponse.json({
      success: true,
      duplication,
    });
  } catch (err) {
    console.error("DuplicationScore API error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
