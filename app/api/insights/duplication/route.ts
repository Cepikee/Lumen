import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";

interface DuplicationRow {
  source: string;
  original: number;
  duplicate: number;
  duplicationScore: number;
}

export async function GET(req: Request) {
  try {
    const sec = securityCheck(req);
    if (sec) return sec;

    // 🔥 1 QUERY – collation fixszel
    const [rows]: any = await db.query(`
      SELECT 
        a.source,
        SUM(a.source COLLATE utf8mb4_0900_ai_ci = c.first_source COLLATE utf8mb4_0900_ai_ci) AS original,
        SUM(a.source COLLATE utf8mb4_0900_ai_ci <> c.first_source COLLATE utf8mb4_0900_ai_ci) AS duplicate
      FROM articles a
      JOIN clusters c ON a.cluster_id = c.id
      WHERE c.first_published_at >= CURDATE()
      GROUP BY a.source
    `);

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
        source: r.source.toLowerCase(),
        original,
        duplicate,
        duplicationScore:
          total === 0 ? 0 : Number(((duplicate / total) * 100).toFixed(1)),
      };
    });

    duplication.sort(
      (a: DuplicationRow, b: DuplicationRow) =>
        b.duplicationScore - a.duplicationScore
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
