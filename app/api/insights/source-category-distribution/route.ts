import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
function fixCat(s: any): string | null {
  if (!s) return null;

  let t = String(s).replace(/[\x00-\x1F\x7F]/g, "").trim();
  if (!t) return null;

  if (/[├â├ę├╝├║]/.test(t)) {
    try {
      t = Buffer.from(t, "latin1").toString("utf8").trim();
    } catch {}
  }

  return t || null;
}

export async function GET(req: Request) {
  try {
    // ⭐ KÖZPONTI SECURITY CHECK
    const sec = securityCheck(req);
    if (sec) return sec;

    // --- 1) Forrás + kategória lekérés ---
    const [rows]: any = await db.query(`
      SELECT 
        TRIM(source) AS source,
        TRIM(category) AS category,
        COUNT(*) AS count
      FROM summaries
      WHERE category IS NOT NULL
        AND category <> ''
        AND source IS NOT NULL
        AND source <> ''
      GROUP BY TRIM(source), TRIM(category)
      ORDER BY TRIM(source) ASC
    `);

    if (!rows || !rows.length) {
      return NextResponse.json({
        success: true,
        items: [],
      });
    }

    // --- 2) Adatok összerakása forrásonként ---
    const map: Record<string, any> = {};

    for (const r of rows) {
  // --- NORMALIZÁLT SOURCE ---
  let src = String(r.source).trim().toLowerCase();

  // ⭐ PORTFOLIO NORMALIZÁLÁS
  if (src === "portfolio") {
    src = "portfolio.hu";
  }

  // --- KATEGÓRIA ÉS COUNT ---
  const cat = fixCat(r.category);
  const count = Number(r.count) || 0;

  if (!src || !cat) continue;

  // --- MAP INIT ---
  if (!map[src]) {
    map[src] = {
      source: src,
      Politika: 0,
      Gazdaság: 0,
      Közélet: 0,
      Kultúra: 0,
      Sport: 0,
      Tech: 0,
      Egészségügy: 0,
      Oktatás: 0,
    };
  }

  // --- KATEGÓRIA HOZZÁADÁSA ---
  if (map[src][cat] !== undefined) {
    map[src][cat] += count;
  }
}


    // --- 3) Válasz tömbbé alakítva ---
    const items = Object.values(map);

    return NextResponse.json({
      success: true,
      items,
    });

  } catch (err) {
    console.error("Category distribution API error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
