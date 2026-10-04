// /pipeline/updateSpeedIndex.js — Speed Index számítás és rangsor frissítés

require("dotenv").config({ path: "/var/www/utom/.env" });

const mysql = require("mysql2/promise");
const { speedHistoryEventKey } = require("./idempotency");
const { normalizeSourceIdentity } = require("../lib/source-identity");

/**
 * Kötelező környezeti változó lekérése.
 * Biztonsági okból nincs beégetett DB user/jelszó fallback.
 */
function requireEnv(name) {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`${name} nincs beállítva.`);
  }

  return value.trim();
}

/**
 * Medián számítása egy tömbből.
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
 * Átlag számítása.
 */
function average(values) {
  if (!values || values.length === 0) return 0;

  return (
    values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length
  );
}

/**
 * Forrásnév normalizálása.
 */
function normalizeSource(source) {
  if (!source) return "";
  const known = normalizeSourceIdentity(source);
  if (known) return known.key;
  return String(source)
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

/**
 * Timestamp ellenőrzése.
 */
function isValidTimestamp(timestamp) {
  return (
    timestamp !== null &&
    timestamp !== undefined &&
    Number.isFinite(timestamp)
  );
}

/**
 * Mentés előtti validáció.
 */
function isSafeStat(
  avg,
  med,
  maxMinutes = 1000
) {
  if (
    !Number.isFinite(avg) ||
    !Number.isFinite(med)
  ) {
    return false;
  }

  if (
    avg <= 0 ||
    med <= 0
  ) {
    return false;
  }

  if (
    avg > maxMinutes ||
    med > maxMinutes
  ) {
    return false;
  }

  return true;
}

/**
 * DB kapcsolat.
 *
 * S-05:
 * - nincs "root" fallback
 * - nincs beégetett jelszó
 * - DB_PASSWORD az egységes jelszóváltozó
 */
async function createDatabaseConnection() {
  const host =
    process.env.DB_HOST?.trim() ||
    "127.0.0.1";

  const user =
    requireEnv("DB_USER");

  const password =
    requireEnv("DB_PASSWORD");

  const database =
    process.env.DB_NAME?.trim() ||
    "utom_dev";

  return mysql.createConnection({
    host,
    port: Number(process.env.DB_PORT || 3306),
    user,
    password,
    database,
  });
}

async function updateSpeedIndex(options = {}) {
  let conn = null;
  const ownsConnection = !options.connection;

  try {
    conn = options.connection || await createDatabaseConnection();

    // Maximum 4 órás különbséget
    // tekintünk ugyanahhoz a hírhez
    // ésszerű késésnek.
    const MAX_DELAY_MINUTES = 240;

    // Mentési biztonsági felső határ.
    const SAFE_MAX_SAVE = 1000;

    // Opcionálisan kizárt források.
    const EXCLUDE_SOURCES =
      new Set([
        "portfolio.hu",
        "portfolio",
      ]);

    // -------------------------------------------------------
    // 1) Mai clusterek
    // -------------------------------------------------------

    if (options.instrumentation) options.instrumentation.fullRecalculations = (options.instrumentation.fullRecalculations || 0) + 1;
    const [clusters] =
      await conn.execute(`
        SELECT id
        FROM clusters
        WHERE first_published_at >= UTC_DATE()
          AND first_published_at < UTC_DATE() + INTERVAL 1 DAY
      `);
    if (options.instrumentation) options.instrumentation.clusterScans = (options.instrumentation.clusterScans || 0) + 1;

    const delaysBySource = {};

    // -------------------------------------------------------
    // 2) Clusterenként forrásonkénti első publikálás
    // -------------------------------------------------------

    for (const cluster of clusters) {
      const clusterId =
        cluster.id;

      const [articles] =
        await conn.execute(
          `
            SELECT
              source,
              MIN(published_at) AS first_published
            FROM articles
            WHERE cluster_id = ?
            GROUP BY source
          `,
          [clusterId]
        );
      if (options.instrumentation) options.instrumentation.clusterArticleQueries = (options.instrumentation.clusterArticleQueries || 0) + 1;

      if (
        !articles ||
        articles.length === 0
      ) {
        continue;
      }

      const earliestBySource = [];

      for (const article of articles) {
        const source =
          normalizeSource(
            article.source
          );

        if (!source) {
          continue;
        }

        if (
          EXCLUDE_SOURCES.has(
            source
          )
        ) {
          continue;
        }

        const publishedAt =
          article.first_published
            ? new Date(
                article.first_published
              ).getTime()
            : null;

        if (
          !isValidTimestamp(
            publishedAt
          )
        ) {
          continue;
        }

        earliestBySource.push({
          source,
          publishedAt,
        });
      }

      // Legalább két különböző
      // forrás kell az összevetéshez.
      const uniqueSources =
        new Set(
          earliestBySource.map(
            (item) =>
              item.source
          )
        );

      if (
        uniqueSources.size < 2
      ) {
        continue;
      }

      const firstPublished =
        Math.min(
          ...earliestBySource.map(
            (item) =>
              item.publishedAt
          )
        );

      // -----------------------------------------------------
      // 2/B) Késések kiszámítása
      // -----------------------------------------------------

      for (
        const item of
          earliestBySource
      ) {
        const delayMinutes =
          (
            item.publishedAt -
            firstPublished
          ) /
          1000 /
          60;

        if (
          !Number.isFinite(
            delayMinutes
          ) ||
          delayMinutes <= 0 ||
          delayMinutes >
            MAX_DELAY_MINUTES
        ) {
          continue;
        }

        if (
          !delaysBySource[
            item.source
          ]
        ) {
          delaysBySource[
            item.source
          ] = [];
        }

        delaysBySource[item.source].push({ clusterId, delayMinutes });
      }
    }

    // -------------------------------------------------------
    // 3) Speed Index mentése
    // -------------------------------------------------------

    let updatedCount = 0;

    for (
      const source of
        Object.keys(
          delaysBySource
        )
    ) {
      const delayEvents =
        delaysBySource[source];

      if (
        !delayEvents ||
        delayEvents.length === 0
      ) {
        continue;
      }

      const delays = delayEvents.map((event) => event.delayMinutes);

      const avg =
        average(delays);

      const med =
        median(delays);

      if (
        !isSafeStat(
          avg,
          med,
          SAFE_MAX_SAVE
        )
      ) {
        console.warn(
          `Skipping save for ${source}: invalid stats avg=${avg}, med=${med}`
        );

        continue;
      }

      await conn.execute(
        `
          INSERT INTO speed_index
            (
              source,
              avg_delay_minutes,
              median_delay_minutes,
              updated_at
            )
          VALUES (?, ?, ?, UTC_TIMESTAMP())
          ON DUPLICATE KEY UPDATE
            avg_delay_minutes =
              VALUES(avg_delay_minutes),
            median_delay_minutes =
              VALUES(median_delay_minutes),
            updated_at = UTC_TIMESTAMP()
        `,
        [
          source,
          Number(
            avg.toFixed(1)
          ),
          Number(
            med.toFixed(1)
          ),
        ]
      );
      if (options.instrumentation) options.instrumentation.sourceWrites = (options.instrumentation.sourceWrites || 0) + 1;
      if (options.hooks?.afterScoreWrite) await options.hooks.afterScoreWrite({ connection: conn, source });

      // -----------------------------------------------------
      // 3/B) History
      // -----------------------------------------------------

      try {
        if (options.hooks?.beforeHistoryWrite) await options.hooks.beforeHistoryWrite({ connection: conn, source, delayEvents });
        const placeholders =
          delayEvents
            .map(
              () =>
                "(?, ?, ?, UTC_TIMESTAMP())"
            )
            .join(", ");

        const params = [];

        for (const event of delayEvents) {
          const normalizedDelay = Number(event.delayMinutes.toFixed(1));
          const eventKey = speedHistoryEventKey(event.clusterId, source, normalizedDelay);
          params.push(
            eventKey,
            source,
            normalizedDelay
          );
        }

        if (
          placeholders.length > 0
        ) {
          await conn.execute(
            `
              INSERT INTO speed_index_history
                (
                  event_key,
                  source,
                  delay_minutes,
                  created_at
                )
              VALUES ${placeholders}
              ON DUPLICATE KEY UPDATE event_key = VALUES(event_key)
            `,
            params
          );
          if (options.instrumentation) options.instrumentation.historyWriteStatements = (options.instrumentation.historyWriteStatements || 0) + 1;
        }
      } catch (error) {
        if (options.strict) throw error;
        // A history hiba ne állítsa meg
        // a teljes Speed Index frissítést.
        console.warn(
          `Failed to write history for ${source}:`,
          error instanceof Error
            ? error.message
            : error
        );
      }

      updatedCount++;
    }

    return {
      status: "ok",
      sourcesUpdated:
        updatedCount,
      rawSourcesFound:
        Object.keys(
          delaysBySource
        ).length,
    };
  } catch (error) {
    console.error(
      "updateSpeedIndex error:",
      error
    );

    throw error;
  } finally {
    if (conn && ownsConnection) {
      try {
        await conn.end();
      } catch {
        // A kapcsolat lezárási hibája
        // nem írja felül az eredeti hibát.
      }
    }
  }
}

// ---------------------------------------------------------
// Közvetlen futtatás
// ---------------------------------------------------------

if (require.main === module) {
  (async () => {
    try {
      const result =
        await updateSpeedIndex();

      console.log(
        "updateSpeedIndex finished:",
        result
      );

      process.exit(0);
    } catch (error) {
      console.error(
        "updateSpeedIndex failed:",
        error
      );

      process.exit(1);
    }
  })();
}

module.exports = {
  updateSpeedIndex,
};
