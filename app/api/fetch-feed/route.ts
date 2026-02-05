// app/api/fetch-feed/route.ts
import { NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";
import Parser from "rss-parser";
import fs from "fs";
import path from "path";

/** Egységes logolás fájlba */
function logError(source: string, err: any) {
  const p = "/var/www/utom/logs/fetch-feed.log";
  const line = `[${new Date().toISOString()}] ${source}: ${
    err instanceof Error ? err.message : String(err)
  }\n`;
  fs.appendFileSync(p, line);
}


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
      case "magyarnemzet.hu": return 7;
      case "origo.hu": return 8;
      case "nepszava.hu": return 9;
      default: return null;
    }
  } catch {
    return null;
  }
}

function titleFromLink(link: string): string {
  try {
    const slug = link.split("/").pop() || "";
    const withoutId = slug.replace(/-\d+$/, "");
    return withoutId.replace(/-/g, " ").trim();
  } catch {
    return "";
  }
}

function aggressiveFixAttributes(xml: string) {
  let out = xml;
  out = out.replace(/(\s(?:src|href|data-src|data-href|poster|srcset|data-srcset)=)(?!["'])([^\s"'>]+)/gi, '$1"$2"');
  out = out.replace(/(\s(on[a-zA-Z]+)=)(["']?)([^"'>\s]+)(["']?)/gi, '');
  out = out.replace(/\u0000/g, "");
  return out;
}

function extractRssFromHtml(html: string): string | null {
  const linkMatch = html.match(/<link[^>]+rel=["']?alternate["']?[^>]*type=["']?(application\/rss\+xml|application\/atom\+xml|application\/xml|text\/xml)["']?[^>]*>/i);
  if (linkMatch) {
    const hrefMatch = linkMatch[0].match(/href=(["'])(.*?)\1/i);
    if (hrefMatch) return hrefMatch[2];
    const hrefMatch2 = linkMatch[0].match(/href=([^\s>]+)/i);
    if (hrefMatch2) return hrefMatch2[1];
  }
  const aMatch = html.match(/<a[^>]+href=(["'])([^"']*rss[^"']*)\1/i);
  if (aMatch) return aMatch[2];
  return null;
}

function looksLikeXmlFeed(xml: string) {
  const s = xml.slice(0, 1000).toLowerCase();
  return s.includes("<rss") || s.includes("<feed") || s.includes("<rdf");
}

export async function GET() {
  console.log(">>> fetch-feed route elindult!");

  try {
    const parser = new Parser({
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
    });

    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
    });

    let inserted = 0;

    /** Böngészőnek álcázott fetch */
    async function fetchAndParse(feedUrl: string, fixHtml = false) {
      const res = await fetch(feedUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
        redirect: "follow",
      });

      const contentType = res.headers.get("content-type") || "";
      const text = await res.text();
      return { status: res.status, ok: res.ok, contentType, text };
    }

    /** Egy feed feldolgozása */
    async function processFeed(
      feedUrl: string,
      sourceName: string,
      forcedSourceId: number | null = null,
      fixHtml = false
    ) {
      const start = Date.now();

      try {
        console.log(`>>> processFeed start: ${sourceName} (${feedUrl})`);

        let { status, ok, contentType, text } = await fetchAndParse(feedUrl, fixHtml);
        console.log(`>>> ${sourceName} HTTP ${status} content-type: ${contentType}`);

        if (!ok) throw new Error(`HTTP ${status}`);

        // HTML fallback
        if (!looksLikeXmlFeed(text) || /text\/html|application\/xhtml\+xml/i.test(contentType)) {
          console.warn(`HTML fallback aktiválva: ${sourceName}`);

          const rssLink = extractRssFromHtml(text);
          if (rssLink) {
            const base = new URL(feedUrl);
            const resolved = rssLink.startsWith("http")
              ? rssLink
              : new URL(rssLink, base).toString();

            console.log(`>>> ${sourceName} fallback RSS URL: ${resolved}`);

            ({ status, ok, contentType, text } = await fetchAndParse(resolved, fixHtml));
            if (!ok) throw new Error(`HTTP ${status} when fetching discovered RSS`);
          } else {
            throw new Error("Nem talált RSS linket a HTML-ben");
          }
        }

        let xml = text;
        if (fixHtml) xml = aggressiveFixAttributes(xml);

        let feed;
        try {
          feed = await parser.parseString(xml);
        } catch (err) {
          console.warn(`⚠️ ${sourceName} parse hiba (első):`, err instanceof Error ? err.message : String(err));
          xml = aggressiveFixAttributes(xml);
          feed = await parser.parseString(xml);
        }

        if (!feed || !Array.isArray(feed.items)) {
          throw new Error("Feed feldolgozása sikertelen");
        }

        for (const item of feed.items) {
          const link = (item.link ?? "").toString();
          if (!link) continue;

          const [rows] = await connection.execute<RowDataPacket[]>(
            "SELECT id FROM articles WHERE url_canonical = ?",
            [link]
          );

          if (rows.length === 0) {
            const sourceId = forcedSourceId ?? detectSourceId(link);
            if (sourceId === null) continue;

            const finalTitle =
              (item.title && item.title.trim()) || titleFromLink(link);

            await connection.execute(
              `INSERT INTO articles (title, url_canonical, content_text, published_at, language, source_id, source)
               VALUES (?, ?, ?, NOW(), ?, ?, ?)`,
              [
                finalTitle,
                link,
                item["content:encoded"] ||
                  item.content ||
                  item.contentSnippet ||
                  "",
                "hu",
                sourceId,
                sourceName,
              ]
            );

            inserted++;
            console.log(`🆕 Új ${sourceName} cikk mentve:`, link);
          }
        }
      } catch (err) {
        console.error(`⚠️ ${sourceName} feed hiba:`, err);
        logError(sourceName, err);
      } finally {
        console.log(
          `>>> ${sourceName} feldolgozási idő: ${Date.now() - start}ms`
        );
      }
    }

    // ---- FEED LISTA ----
    await processFeed("https://telex.hu/rss", "Telex");
    await processFeed("https://hvg.hu/rss", "HVG");
    await processFeed("https://24.hu/feed", "24.hu");
    await processFeed("https://index.hu/24ora/rss/", "Index");
    await processFeed("https://444.hu/feed", "444");
    await processFeed("https://www.portfolio.hu/rss/all.xml", "Portfolio", 5, true);

    await connection.end();

    return NextResponse.json({ status: "ok", inserted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Ismeretlen hiba történt";
    console.error("API /fetch-feed hiba:", message);
    logError("GLOBAL", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
