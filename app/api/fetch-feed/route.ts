// app/api/fetch-feed/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";
import Parser from "rss-parser";
import fs from "fs";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import { blockedCapabilityResponse } from "@/lib/config/routeGuard";
import { requireInternalWorker } from "@/lib/security/internal-worker";

/** Logolás */
function logError(source: string, err: any) {
  const p = "/var/www/utom/logs/fetch-feed.log";
  const line = `[${new Date().toISOString()}] ${source}: ${
    err instanceof Error ? err.message : String(err)
  }\n`;

  fs.appendFileSync(p, line);
}

/** FEED STATISZTIKA */
const feedStats: Record<string, number> = {
  Telex: 0,
  HVG: 0,
  "24.hu": 0,
  Index: 0,
  Portfolio: 0,
  "444.hu": 0,
  Origo: 0,
};

/** Domain → source_id */
function detectSourceId(url: string | null | undefined): number | null {
  if (!url) return null;

  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");

    switch (domain) {
      case "telex.hu":
        return 1;
      case "24.hu":
        return 2;
      case "index.hu":
        return 3;
      case "hvg.hu":
        return 4;
      case "portfolio.hu":
        return 5;
      case "444.hu":
        return 6;
      case "origo.hu":
        return 7;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/** HTML tisztítás */
function cleanHtmlText(text: string) {
  return text.replace(/\s+/g, " ").replace(/\n+/g, " ").trim();
}

/** Puppeteer wrapper */
async function loadWithPuppeteer(url: string): Promise<string> {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();

      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
      );

      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });

      return await page.content();
    } finally {
      await browser.close();
    }
  } catch (err) {
    logError("PUPPETEER", err);
    return "";
  }
}

/** 444.hu feed Puppeteerrel */
async function fetch444FeedWithPuppeteer(): Promise<string> {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();

      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
      );

      const response = await page.goto("https://444.hu/feed", {
        waitUntil: "networkidle2",
        timeout: 60000,
      });

      if (!response) {
        logError(
          "444-FEED-PUPPETEER",
          "No response from page.goto()"
        );
        return "";
      }

      return await response.text();
    } finally {
      await browser.close();
    }
  } catch (err) {
    logError("444-FEED-PUPPETEER", err);
    return "";
  }
}

/** Portfolio fallback */
async function fetchPortfolioArticle(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
      },
    });

    const html = await res.text();
    let $ = cheerio.load(html);
    let article = $(".article-content, .article-body, article");
    let text = cleanHtmlText(article.text());

    if (text.length > 500) {
      return text;
    }

    logError(
      "PORTFOLIO-FALLBACK",
      `Fetch too short (len=${text.length}), using Puppeteer`
    );

    const html2 = await loadWithPuppeteer(url);
    $ = cheerio.load(html2);
    article = $(".article-content, .article-body, article");
    text = cleanHtmlText(article.text());

    return text;
  } catch (err) {
    logError("PORTFOLIO", err);
    return "";
  }
}

/** OPENAI SUMMARIZER – eredeti prompt, fallback nélkül */
async function summarizeArticle(title: string, content: string) {
  const res = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `
Foglalj össze magyarul tényszerűen, 5-8 mondatban.
Adj vissza egy JSON-t a következő formában:

{
  "category": "…",
  "short_summary": "…"
}

Semmi mást ne írj, csak érvényes JSON-t.
`,
          },
          {
            role: "user",
            content: `Cikk címe: ${title}\n\nCikk tartalma:\n${content}`,
          },
        ],
      }),
    }
  );

  const json = await res.json();
  return JSON.parse(json.choices[0].message.content);
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

  try {
    const parser = new Parser({
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
      },
    });

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      user: process.env.DB_USER || "utom_app",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "utom_dev",
    });

    let inserted = 0;

    /** RSS feldolgozás */
    async function processRssFeed(
      xmlOrUrl: string,
      sourceName: string,
      isXml = false
    ) {
      try {
        let xml = "";

        if (isXml) {
          xml = xmlOrUrl;
        } else {
          const res = await fetch(xmlOrUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
            },
          });

          xml = await res.text();
        }

        const feed = await parser.parseString(xml);

        for (const item of feed.items) {
          const link = item.link;
          if (!link) continue;

          const [rows] = await connection.execute<RowDataPacket[]>(
            "SELECT id FROM articles WHERE url_canonical = ?",
            [link]
          );

          if (rows.length === 0) {
            const sourceId = detectSourceId(link);
            if (!sourceId) continue;

            let content: string;

            if (sourceId === 6) {
              // 444.hu → content:encoded-ben benne a teljes cikk
              content =
                item["content:encoded"] || item.content || "";
            } else if (sourceId === 7) {
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
            if (sourceId === 5 && content.length < 500) {
              content = await fetchPortfolioArticle(link);
            }

            // --- CIKK BESZÚRÁSA ---
            await connection.execute(
              `INSERT INTO articles
                (title, url_canonical, content_text, published_at,
                 language, source_id, source)
               VALUES (?, ?, ?, NOW(), ?, ?, ?)`,
              [
                item.title || "",
                link,
                content,
                "hu",
                sourceId,
                sourceName,
              ]
            );

            inserted++;

            feedStats[sourceName] =
              (feedStats[sourceName] || 0) + 1;

            // --- ÚJ CIKK ID LEKÉRÉSE ---
            const [idRows] =
              await connection.execute<RowDataPacket[]>(
                "SELECT id FROM articles WHERE url_canonical = ?",
                [link]
              );

            const newId = idRows[0].id;

            // --- OPENAI ÖSSZEFOGLALÁS ---
            const summary = await summarizeArticle(
              item.title || "",
              content
            );

            // --- VISSZAÍRÁS AZ ARTICLES TÁBLÁBA ---
            await connection.execute(
              `UPDATE articles
               SET category = ?, short_summary = ?
               WHERE id = ?`,
              [
                summary.category,
                summary.short_summary,
                newId,
              ]
            );
          }
        }
      } catch (err) {
        logError(sourceName, err);
      }
    }

    // ---- FEED LISTA ----
    await processRssFeed(
      "https://telex.hu/rss",
      "Telex"
    );

    await processRssFeed(
      "https://hvg.hu/rss",
      "HVG"
    );

    await processRssFeed(
      "https://24.hu/feed",
      "24.hu"
    );

    await processRssFeed(
      "https://index.hu/24ora/rss/",
      "Index"
    );

    await processRssFeed(
      "https://www.portfolio.hu/rss/all.xml",
      "Portfolio"
    );

    await processRssFeed(
      "https://www.origo.hu/publicapi/hu/rss/origo/articles",
      "Origo"
    );

    const feed444 = await fetch(
      "https://royal-king-47c3.vashiri6562.workers.dev/"
    ).then((r) => r.text());

    await processRssFeed(
      feed444,
      "444.hu",
      true
    );

    await connection.end();

    return NextResponse.json({
      status: "ok",
      inserted,
      stats: feedStats,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
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