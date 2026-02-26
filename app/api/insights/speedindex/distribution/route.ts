// app/api/insights/speedindex/distribution/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";

export async function GET(req: Request) {
  try {
    const sec = securityCheck(req);
    if (sec) return sec;

    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source");

    if (!source) {
      return NextResponse.json(
        { success: false, error: "missing_source" },
        { status: 400 }
      );
    }

    // --- 1) Késések lekérése ---
    const [rows]: any = await db.query(
      `
      SELECT 
        published_at,
        cluster_id
      FROM articles
      WHERE source = ?
      ORDER BY published_at ASC
      `,
      [source]
    );

    // --- 2) Késések kiszámítása cluster alapján ---
    const delays: number[] = [];

    for (const row of rows) {
      const [clusterRows]: any = await db.query(
        `
        SELECT MIN(published_at) AS firstTime
        FROM articles
        WHERE cluster_id = ?
        `,
        [row.cluster_id]
      );

      const firstTime = new Date(clusterRows[0].firstTime).getTime();
      const pubTime = new Date(row.published_at).getTime();

      const delayMinutes = (pubTime - firstTime) / 1000 / 60;
      delays.push(delayMinutes);
    }

    return NextResponse.json({
      success: true,
      delays,
    });
  } catch (err) {
    console.error("Distribution API error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
