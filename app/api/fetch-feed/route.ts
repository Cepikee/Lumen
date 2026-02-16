// app/api/fetch-feed/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";
import Parser from "rss-parser";
import fs from "fs";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

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
  "Telex": 0,
  "HVG": 0,
  "24.hu": 0,
  "Index": 0,
  "Portfolio": 0,
  "444.hu": 0
};

/** Domain → source_id */
function detectSourceId(url: string | null | undefined): number | null {
  if (!url) return null;
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    switch (domain) {
      case "telex.hu": return 1;
      case "24.hu": return 2;
      case "index.hu": return 3;
      case "hvg.hu": return 4;
      case "portfolio.hu": return 5;
      case "444.hu": return 6;
      default: return null;
    }
  } catch {
    return null;
  }
}

/** HTML tisztítás */
function cleanHtmlText(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
}

/** ⭐ Puppeteer wrapper */
async function loadWithPuppeteer(url: string): Promise<string> {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    const html = await page.content();
    await browser.close();
    return html;
  } catch (err) {
    logError("PUPPETEER", err);
    return "";
  }
}

/** ⭐ Portfolio fallback */
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

    logError("PORTFOLIO-FALLBACK", `Fetch too short (len=${text.length}), using Puppeteer`);

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

export async function GET() {
  try {
    const parser = new Parser({
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
      },
    });

    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
    });

    let inserted = 0;

    /** ⭐ RSS feldolgozás (444.hu feed támogatással) */
    async function processRssFeed(xmlOrUrl: string, sourceName: string, isXml = false) {
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
              // ⭐ 444.hu → teljes HTML-t mentünk, nem tisztítunk
              content = item["content:encoded"] || item.content || "";
            } else {
              // ⭐ Minden más forrás → tisztított szöveg
              const rawContent = item["content:encoded"] || item.content || "";
              content = cleanHtmlText(cheerio.load(rawContent).text());
            }

            // ⭐ Portfolio fallback
            if (sourceId === 5 && content.length < 500) {
              content = await fetchPortfolioArticle(link);
            }

            await connection.execute(
              `INSERT INTO articles (title, url_canonical, content_text, published_at, language, source_id, source)
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
            feedStats[sourceName] = (feedStats[sourceName] || 0) + 1;
          }
        }
      } catch (err) {
        logError(sourceName, err);
      }
    }

    // ---- NORMÁL FEED LISTA ----
    await processRssFeed("https://telex.hu/rss", "Telex");
    await processRssFeed("https://hvg.hu/rss", "HVG");
    await processRssFeed("https://24.hu/feed", "24.hu");
    await processRssFeed("https://index.hu/24ora/rss/", "Index");
    await processRssFeed("https://www.portfolio.hu/rss/all.xml", "Portfolio");
    await processRssFeed("https://444.hu/feed", "444.hu");

    await connection.end();

    /** ⭐ FEED STATISZTIKA KIÍRÁSA */
    console.log("──────────────── FEED STATISZTIKA ────────────────");
    for (const [source, count] of Object.entries(feedStats)) {
      console.log(`[FEED-STATS] ${source} → ${count} új cikk`);
      fs.appendFileSync(
        "/var/www/utom/logs/fetch-feed.log",
        `[${new Date().toISOString()}] FEED-STATS ${source}: ${count} új cikk\n`
      );
    }
    console.log("────────────────────────────────────────────────────");

    return NextResponse.json({
      status: "ok",
      inserted,
      stats: feedStats
    });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// rák egye ki a gyomrát
