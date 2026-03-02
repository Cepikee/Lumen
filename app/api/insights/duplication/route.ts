import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";

export async function GET(req: Request) {
  try {
    const sec = securityCheck(req);
    if (sec) return sec;

    // 1️⃣ Lekérjük az összes mai clustert
    const [clusters]: any = await db.query(`
      SELECT id, first_source
      FROM clusters
      WHERE first_published_at >= CURDATE()
    `);

    if (!clusters || clusters.length === 0) {
      return NextResponse.json({
        success: true,
        duplication: [],
      });
    }

    // Forrásonkénti számlálók
    const stats: Record<
      string,
      { original: number; duplicate: number }
    > = {};

    // 2️⃣ Végigmegyünk minden clusteren
    for (const c of clusters) {
      const clusterId = c.id;
      const firstSource = c.first_source?.toLowerCase();

      // 2/a) Lekérjük a cluster összes cikkét
      const [articles]: any = await db.query(
        `
        SELECT source
        FROM articles
        WHERE cluster_id = ?
        `,
        [clusterId]
      );

      if (!articles || articles.length === 0) continue;

      // 2/b) Forrásonként számolunk
      const sourcesInCluster = articles.map((a: any) =>
        a.source.toLowerCase()
      );

      // Original
      if (!stats[firstSource]) {
        stats[firstSource] = { original: 0, duplicate: 0 };
      }
      stats[firstSource].original++;

      // Duplicate (mindenki, aki nem első)
      for (const src of sourcesInCluster) {
        if (src === firstSource) continue;

        if (!stats[src]) {
          stats[src] = { original: 0, duplicate: 0 };
        }
        stats[src].duplicate++;
      }
    }

    // 3️⃣ Végső lista összeállítása
    const duplication = Object.keys(stats).map((source) => {
      const s = stats[source];
      const total = s.original + s.duplicate;

      const score =
        total === 0 ? 0 : Number(((s.duplicate / total) * 100).toFixed(1));

      return {
        source,
        original: s.original,
        duplicate: s.duplicate,
        duplicationScore: score,
      };
    });

    // 4️⃣ Rendezés: ki a leginkább "követő"
    duplication.sort((a, b) => b.duplicationScore - a.duplicationScore);

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
