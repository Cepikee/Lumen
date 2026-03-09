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
    const sec = securityCheck(req);
    if (sec) return sec;

    // ⭐ DOMAIN PARAMÉTER BEOLVASÁSA
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain")?.trim().toLowerCase();

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
      return NextResponse.json({ success: true, items: [] });
    }

    // --- 2) Adatok összerakása forrásonként ---
    const map: Record<string, any> = {};

    for (const r of rows) {
      let src = String(r.source).trim().toLowerCase();

      if (src === "portfolio") {
        src = "portfolio.hu";
      }

      const cat = fixCat(r.category);
      const count = Number(r.count) || 0;

      if (!src || !cat) continue;

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

      if (map[src][cat] !== undefined) {
        map[src][cat] += count;
      }
    }

    const items = Object.values(map);

    // ⭐ DOMAIN SZŰRÉS – CSAK HA KÉRVE VAN
    if (domain) {
      return NextResponse.json({
        success: true,
        items: items.filter((i: any) => i.source === domain),
      });
    }

    // ⭐ HA NINCS DOMAIN → VISSZAADJUK AZ ÖSSZESET (mint eddig)
    return NextResponse.json({ success: true, items });

  } catch (err) {
    console.error("Category distribution API error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
