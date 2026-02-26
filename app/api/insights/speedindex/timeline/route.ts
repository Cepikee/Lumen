// app/api/insights/speedindex/timeline/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";

export async function GET(req: Request) {
  try {
    const sec = securityCheck(req);
    if (sec) return sec;

    const { searchParams } = new URL(req.url);
    const clusterId = searchParams.get("cluster_id");

    if (!clusterId) {
      return NextResponse.json(
        { success: false, error: "missing_cluster_id" },
        { status: 400 }
      );
    }

    // --- 1) Cikkek lekérése a clusterből ---
    const [rows]: any = await db.query(
      `
      SELECT 
        source,
        published_at AS publishedAt
      FROM articles
      WHERE cluster_id = ?
      ORDER BY published_at ASC
      `,
      [clusterId]
    );

    return NextResponse.json({
      success: true,
      items: rows || [],
    });
  } catch (err) {
    console.error("Timeline API error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
