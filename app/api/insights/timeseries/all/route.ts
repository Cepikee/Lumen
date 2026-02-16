// app/api/insights/timeseries/all/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function normalizeDbString(s: any): string | null {
  if (s === null || s === undefined) return null;
  let t = String(s).trim();
  if (!t) return null;
  if (t.toLowerCase() === "null") return null;
  const hasMojibake = /[├â├ę├╝├║]/.test(t);
  if (hasMojibake) {
    try { t = Buffer.from(t, "latin1").toString("utf8"); } catch {}
  }
  return t || null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "7d";

  let hoursBack = 24;
  if (period === "7d") hoursBack = 24 * 7;
  if (period === "30d") hoursBack = 24 * 30;
  if (period === "90d") hoursBack = 24 * 90;

  const now = new Date();
  const nowUtc = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  const startUtc = new Date(nowUtc.getTime() - hoursBack * 60 * 60 * 1000);
  const startStr = startUtc.toISOString().slice(0, 19).replace("T", " ");

  try {
    // --- BEILLESZTENDŐ JAVÍTOTT BLOKK (itt legyen) ---
    const [cats]: any = await db.query(`
      SELECT DISTINCT TRIM(category) AS category
      FROM summaries
      WHERE category IS NOT NULL AND category <> ''
    `);

    function decodeIfMojibake(s: string | null): string | null {
      if (!s) return null;
      const t = String(s).trim();
      if (!t) return null;
      if (/[├â├ę├╝├║]/.test(t)) {
        try { return Buffer.from(t, "latin1").toString("utf8").trim(); } catch { return t; }
      }
      return t;
    }

    const rawCats = (cats || []).map((c: any) => c.category);
    const normSet = new Map<string, string>();
    for (const rc of rawCats) {
      const decoded = decodeIfMojibake(rc) ?? rc;
      const normalized = decoded ? decoded.trim() : "";
      if (!normalized) continue;
      const key = normalized.toLowerCase();
      if (!normSet.has(key)) normSet.set(key, normalized);
    }
    const categories = Array.from(normSet.values());

    const results: any[] = [];

    for (const cat of categories) {
      if (!cat) continue;
      const [rows]: any = await db.query(
        `
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') AS bucket,
          COUNT(*) AS count
        FROM summaries
        WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))
          AND created_at >= ?
        GROUP BY bucket
        ORDER BY bucket ASC
        `,
        [cat, startStr]
      );

      const map = new Map<string, number>();
      for (const r of rows || []) map.set(String(r.bucket), Number(r.count) || 0);

      const cursor = new Date(startUtc);
      cursor.setMinutes(0, 0, 0);

      const points: { date: string; count: number }[] = [];
      while (cursor <= nowUtc) {
        const key = cursor.toISOString().slice(0, 19).replace("T", " ");
        points.push({ date: key, count: map.get(key) ?? 0 });
        cursor.setHours(cursor.getHours() + 1);
      }

      results.push({ category: cat, points });
    }

    return NextResponse.json({ success: true, period, categories: results });
  } catch (err) {
    console.error("Timeseries ALL error:", err);
    return NextResponse.json({ success: false, error: "server_error" }, { status: 500 });
  }
}
