// app/api/fetch-feed/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import Parser from "rss-parser";
import * as cheerio from "cheerio";
import { canonicalizeArticleUrl } from "@/lib/article-identity";
import { ingestFeedArticle } from "@/lib/feed-ingestion";
import { sourceIdentityFromUrl } from "@/lib/source-identity";
import { blockedCapabilityResponse } from "@/lib/config/routeGuard";
import { requireInternalWorker } from "@/lib/security/internal-worker";
import { appendOperationalLog } from "@/lib/safe-log";
import { fetchPinnedText } from "@/lib/safe-fetch";

/** Logolás */
function logError(source: string, err: any) {
  const line = `[${new Date().toISOString()}] ${source}: ${
    err instanceof Error ? err.message : String(err)
  }\n`;
  appendOperationalLog("fetch-feed.log", line);
}

/** HTML tisztítás */
function cleanHtmlText(text: string) {
  return text.replace(/\s+/g, " ").replace(/\n+/g, " ").trim();
}

/** Portfolio fallback */
async function fetchPortfolioArticle(url: string): Promise<string> {
  try {
    const result = await fetchPinnedText(url, {
      timeoutMs: 20_000,
      maxRedirects: 5,
      maxBytes: 2 * 1024 * 1024,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(result.text);
    const article = $(".article-content, .article-body, article");
    return cleanHtmlText(article.text());
  } catch (err) {
    logError("PORTFOLIO", err);
    return "";
  }
}

/**
 * S-02:
 * Hírgyűjtés kizárólag hitelesített, szerveroldali POST-kéréssel.
 * A böngészőből indított nyilvános GET nem futtathat feldolgozást.
 */
export async function POST(req: Request) {
  // Elsőként a bejövő kérés jogosultságát ellenőrizzük.
  // Jogosulatlan kérésnél sem DB-kapcsolat, sem AI-hívás nem indul.
  const denied = requireInternalWorker(req);
  if (denied) return denied;

  // A meglévő környezeti képességkorlátokat is megtartjuk.
  const blocked = blockedCapabilityResponse([
    "feedFetch",
    "databaseWrite",
    "realAi",
  ]);

  if (blocked) return blocked;

  let connection: mysql.Connection | null = null;
  try {
    // A statisztika egy feldolgozási futás eredménye. Modul-szintű mutable
    // objektum esetén a következő kérés az előző futás számait is visszaadná.
    const feedStats: Record<string, number> = {
      Telex: 0,
      HVG: 0,
      "24.hu": 0,
      Index: 0,
      Portfolio: 0,
      "444.hu": 0,
      Origo: 0,
    };

    const parser = new Parser({
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
      },
    });

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      user: process.env.DB_USER || "utom_app",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "utom_dev",
    });
    const activeConnection = connection;
    const [activeRows] = await activeConnection.query<mysql.RowDataPacket[]>("SELECT id FROM sources WHERE is_active=1");
    const activeSourceIds = new Set(activeRows.map((row) => Number(row.id)));

    let inserted = 0;
    let deduplicated = 0;
    let malformed = 0;
    let feedAttempts = 0;
    let feedFailures = 0;

    /** RSS feldolgozás */
    async function processRssFeed(
      xmlOrUrl: string,
      sourceName: string,
      sourceId: number,
      isXml = false
    ) {
      if (!activeSourceIds.has(sourceId)) return;
      feedAttempts++;
      try {
        let xml = "";

        if (isXml) {
          xml = xmlOrUrl;
        } else {
          const result = await fetchPinnedText(xmlOrUrl, {
            timeoutMs: 20_000,
            maxRedirects: 5,
            maxBytes: 5 * 1024 * 1024,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
            },
          });

          xml = result.text;
        }

        const feed = await parser.parseString(xml);

        for (const item of feed.items) {
          const originalLink = item.link;
          const link = canonicalizeArticleUrl(originalLink);
          if (!link) continue;

            const sourceIdentity = sourceIdentityFromUrl(link);
            if (!sourceIdentity) continue;

            let content: string;

            if (sourceIdentity.sourceId === 6) {
              // 444.hu → content:encoded-ben benne a teljes cikk
              content =
                item["content:encoded"] || item.content || "";
            } else if (sourceIdentity.sourceId === 7) {
              // Origo → RSS-ben gyakorlatilag nincs rendes cikk
              content = "";
            } else {
              const rawContent =
                item["content:encoded"] || item.content || "";

              content = cleanHtmlText(
                cheerio.load(rawContent).text()
              );
            }

            // Portfolio: ha az RSS-ből kevés jön, külön letöltjük
            if (sourceIdentity.sourceId === 5 && content.length < 500) {
              content = await fetchPortfolioArticle(link);
            }

            // --- CIKK BESZÚRÁSA ---
            const ingestion = await ingestFeedArticle(activeConnection, {
              title: item.title,
              originalUrl: originalLink,
              content,
              source: sourceName,
              publishedAt: item.isoDate || item.pubDate,
              externalId: item.guid,
              language: "hu",
            });
            if (ingestion.outcome === "inserted") inserted++;
            else if (ingestion.outcome === "deduplicated") deduplicated++;
            else { malformed++; continue; }

            feedStats[sourceName] =
              (feedStats[sourceName] || 0) + 1;

        }
      } catch (err) {
        feedFailures++;
        logError(sourceName, err);
      }
    }

    // ---- FEED LISTA ----
    await processRssFeed(
      "https://telex.hu/rss",
      "Telex", 1
    );

    await processRssFeed(
      "https://hvg.hu/rss",
      "HVG", 4
    );

    await processRssFeed(
      "https://24.hu/feed",
      "24.hu", 2
    );

    await processRssFeed(
      "https://index.hu/24ora/rss/",
      "Index", 3
    );

    await processRssFeed(
      "https://www.portfolio.hu/rss/all.xml",
      "Portfolio", 5
    );

    await processRssFeed(
      "https://www.origo.hu/publicapi/hu/rss/origo/articles",
      "Origo", 7
    );

    if (activeSourceIds.has(6)) {
      const feed444 = await fetchPinnedText("https://royal-king-47c3.vashiri6562.workers.dev/", {
        timeoutMs: 20_000,
        maxRedirects: 5,
        maxBytes: 5 * 1024 * 1024,
      });
      await processRssFeed(feed444.text, "444.hu", 6, true);
    }

    if (feedAttempts > 0 && feedFailures === feedAttempts) {
      return NextResponse.json(
        { error: "feed_fetch_failed", attempted: feedAttempts },
        { status: 502 },
      );
    }

    return NextResponse.json({
      status: "ok",
      inserted,
      deduplicated,
      malformed,
      feedAttempts,
      feedFailures,
      stats: feedStats,
    });
  } catch (err) {
    console.error("FETCH FEED ERROR:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "feed_fetch_failed" },
      { status: 500 }
    );
  } finally {
    await connection?.end();
  }
}

/**
 * A korábbi nyilvános GET-kérés többé
 * nem indíthat hírgyűjtést.
 */
export async function GET() {
  return NextResponse.json(
    { error: "method_not_allowed" },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    }
  );
}
