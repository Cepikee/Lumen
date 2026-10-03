import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
import { businessDayBounds, mysqlUtc } from "@/lib/business-time";
import { normalizeSourceIdentity } from "@/lib/source-identity";

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

// The database contains historical category values with inconsistent casing.
// Keep the response contract stable so e.g. "politika" is not silently
// dropped by the UI, which renders the canonical Hungarian labels below.
function canonicalCategory(s: any): string | null {
  const value = fixCat(s);
  if (!value) return null;
  const key = value.toLocaleLowerCase("hu-HU");
  const labels = new Map([
    ["politika", "Politika"],
    ["gazdaság", "Gazdaság"],
    ["közélet", "Közélet"],
    ["kultúra", "Kultúra"],
    ["sport", "Sport"],
    ["tech", "Tech"],
    ["egészségügy", "Egészségügy"],
    ["oktatás", "Oktatás"],
  ]);
  return labels.get(key) ?? null;
}

export async function GET(req: Request) {
  try {
    const sec = await securityCheck(req);
    if (sec) return sec;

    // ⭐ DOMAIN PARAMÉTER BEOLVASÁSA
    const { searchParams } = new URL(req.url);
    // The response canonicalizes the legacy Portfolio spelling below. Apply
    // the same canonicalization to the incoming filter or a request for
    // `domain=portfolio` would incorrectly return an empty result.
    const rawDomain = searchParams.get("domain")?.trim().toLowerCase();
    // Filter keys use the same canonical identity as response rows. Without
    // this, aliases such as `24hu` and `24.hu` silently produce empty charts.
    const domain = normalizeSourceIdentity(rawDomain)?.key
      ?? (rawDomain === "portfolio" ? "portfolio.hu" : rawDomain);
    const today = businessDayBounds(new Date());

    // --- 1) Forrás + kategória lekérés ---
    const [rows]: any = await db.query(`
      SELECT 
        LOWER(TRIM(source)) AS source,
        MIN(TRIM(category)) AS category,
        COUNT(*) AS count
      FROM summaries
      WHERE created_at >= ? AND created_at < ?
        AND category IS NOT NULL
        AND category <> ''
        AND source IS NOT NULL
        AND source <> ''
      GROUP BY LOWER(TRIM(source)), LOWER(TRIM(category))
      ORDER BY LOWER(TRIM(source)) ASC
    `, [mysqlUtc(today.start), mysqlUtc(today.end)]);

    if (!rows || !rows.length) {
      return NextResponse.json({ success: true, items: [] });
    }

    // --- 2) Adatok összerakása forrásonként ---
    const map: Record<string, any> = {};

    for (const r of rows) {
      const rawSource = String(r.source).trim().toLowerCase();
      let src = normalizeSourceIdentity(rawSource)?.key ?? rawSource;
      if (src === "portfolio") src = "portfolio.hu";

      const cat = canonicalCategory(r.category);
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
