// /pipeline/updateSpeedIndex.js — Javított Speed Index számítás és rangsor frissítés
require("dotenv").config({ path: "/var/www/utom/.env" });
const mysql = require("mysql2/promise");

/**
 * Medián számítása egy tömbből
 */
function median(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Átlag számítása (null-safe)
 */
function average(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Forrásnév normalizálása (kis- és nagybetű, whitespace)
 */
function normalizeSource(src) {
  if (!src) return "";
  return src.trim().toLowerCase();
}

/**
 * Ellenőrzi, hogy a timestamp érvényes-e
 */
function isValidTimestamp(ts) {
  return ts !== null && ts !== undefined && !Number.isNaN(ts) && isFinite(ts);
}

/**
 * Speed Index frissítése az összes cluster alapján
 *
 * Javítások, amiket beépít:
 * - egy clusterből forrásonként csak a legkorábbi cikket vesszük figyelembe
 * - ha egy clusterben kevesebb, mint 2 különböző forrás van, kihagyjuk (nincs összehasonlítás)
 * - az első (legelső) forrás késését (0) nem toljuk be a késések közé, így a medián nem lesz automatikusan 0
 * - negatív vagy túl nagy késéseket kiszűrünk (pl. > 240 perc)
 * - Portfolio jellegű forrásokat opcionálisan kizárunk (konfigurálható)
 * - hibakezelés és logolás
 */
async function updateSpeedIndex() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "jelszo",
    database: process.env.DB_NAME || "projekt2025",
    // optional: increase timeout if needed
    // connectTimeout: 10000,
  });

  try {
    // Konfiguráció
    const MAX_DELAY_MINUTES = 240; // 4 óra: ennél nagyobb különbség valószínűleg nem ugyanaz a hír
    const EXCLUDE_SOURCES = new Set(["portfolio.hu", "portfolio"]); // ha kell, bővíthető

    // 1) Lekérjük az összes clustert
    const [clusters] = await conn.execute("SELECT id FROM clusters");

    // Forrásonként gyűjtjük a késéseket (percben)
    const delaysBySource = {};

    // 2) Végigmegyünk minden clusteren
    for (const cluster of clusters) {
      const clusterId = cluster.id;

      // 2/a) Lekérjük a cluster összes cikkét (forrásonként a legkorábbi publikálás)
      const [articles] = await conn.execute(
        `
        SELECT source, MIN(published_at) AS first_published
        FROM articles
        WHERE cluster_id = ?
        GROUP BY source
        `,
        [clusterId]
      );

      if (!articles || articles.length === 0) continue;

      // Normalizált források és időpontok
      const earliestBySource = [];
      for (const a of articles) {
        const src = normalizeSource(a.source);
        if (!src) continue;
        if (EXCLUDE_SOURCES.has(src)) continue; // opcionális kizárás

        const publishedAt = a.first_published ? new Date(a.first_published).getTime() : null;
        if (!isValidTimestamp(publishedAt)) continue;

        earliestBySource.push({ source: src, publishedAt });
      }

      // Ha kevesebb mint 2 különböző forrás van, nincs összehasonlítás
      const uniqueSources = new Set(earliestBySource.map((x) => x.source));
      if (uniqueSources.size < 2) continue;

      // 2/b) Az első (globálisan legkorábbi) publikálási idő a clusterben
      const firstPublished = Math.min(...earliestBySource.map((x) => x.publishedAt));

      // 2/c) Forrásonként kiszámoljuk a késést (csak >0 és ésszerű értékek)
      for (const item of earliestBySource) {
        const delayMinutes = (item.publishedAt - firstPublished) / 1000 / 60;

        // kizárjuk a negatív értékeket (ha valami időzóna/probléma) és a túl nagy értékeket
        if (!isFinite(delayMinutes) || delayMinutes <= 0 || delayMinutes > MAX_DELAY_MINUTES) {
          continue;
        }

        if (!delaysBySource[item.source]) delaysBySource[item.source] = [];
        delaysBySource[item.source].push(delayMinutes);
      }
    }

    // 3) Speed Index táblába mentjük az eredményeket
    let updatedCount = 0;
    for (const source of Object.keys(delaysBySource)) {
      const delays = delaysBySource[source];

      // Ha nincs érvényes késés (pl. minden clusterben 0 volt vagy kiszűrtük), kihagyjuk
      if (!delays || delays.length === 0) continue;

      const avg = average(delays);
      const med = median(delays);

      // Mentés: kerekítve 1 tizedesre, de a DB mező típusa szerint módosítható
      await conn.execute(
        `
        INSERT INTO speed_index (source, avg_delay_minutes, median_delay_minutes, updated_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          avg_delay_minutes = VALUES(avg_delay_minutes),
          median_delay_minutes = VALUES(median_delay_minutes),
          updated_at = NOW()
        `,
        [source, Number(avg.toFixed(1)), Number(med.toFixed(1))]
      );

      updatedCount++;
    }

    await conn.end();

    return {
      status: "ok",
      sourcesUpdated: updatedCount,
      rawSourcesFound: Object.keys(delaysBySource).length,
    };
  } catch (err) {
    await conn.end();
    console.error("updateSpeedIndex error:", err);
    throw err;
  }
}

// Ha közvetlenül futtatod: futtatás és log
if (require.main === module) {
  (async () => {
    try {
      const res = await updateSpeedIndex();
      console.log("updateSpeedIndex finished:", res);
      process.exit(0);
    } catch (e) {
      console.error("updateSpeedIndex failed:", e);
      process.exit(1);
    }
  })();
}

module.exports = { updateSpeedIndex };
