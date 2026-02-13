// app/api/fetch-feed/route.ts
import { NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";
import Parser from "rss-parser";
import fs from "fs";
import http from "http";
import https from "https";
import { HttpsProxyAgent } from "https-proxy-agent";

/** Ingyenes proxy lista */
const FREE_PROXIES = [
  "http://51.158.68.133:8811",
  "http://51.159.66.158:3128",
  "http://185.199.229.156:7492",
  "http://185.199.229.156:7300",
  "http://185.199.229.156:7497",
  "http://185.199.229.156:7490",
];

/** Logolás */
function logError(source: string, err: any) {
  const p = "/var/www/utom/logs/fetch-feed.log";
  const line = `[${new Date().toISOString()}] ${source}: ${
    err instanceof Error ? err.message : String(err)
  }\n`;
  fs.appendFileSync(p, line);
}

/** Proxy-s lekérés natív Node.js HTTP(S) requesttel */
async function proxyRequest(url: string): Promise<string> {
  for (const proxy of FREE_PROXIES) {
    try {
      const agent = new HttpsProxyAgent(proxy);

      const client = url.startsWith("https") ? https : http;

      const text: string = await new Promise((resolve, reject) => {
        const req = client.get(
          url,
          {
            agent,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
              Accept: "application/rss+xml,text/xml,application/xml",
            },
          },
          (res) => {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}`));
              return;
            }

            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => resolve(data));
          }
        );

        req.on("error", reject);
      });

      console.log(`444.hu PROXY OK → ${proxy}`);
      return text;
    } catch (err) {
      console.log(`444.hu PROXY FAIL (${proxy}) →`, err);
    }
  }

  throw new Error("444.hu feed: minden proxy sikertelen");
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

function aggressiveFixAttributes(xml: string) {
  let out = xml;
  out = out.replace(/(\s(?:src|href|data-src|data-href|poster|srcset|data-srcset)=)(?!["'])([^\s"'>]+)/gi, '$1"$2"');
  out = out.replace(/(\s(on[a-zA-Z]+)=)(["']?)([^"'>\s]+)(["']?)/gi, '');
  out = out.replace(/\u0000/g, "");
  return out;
}

function looksLikeXmlFeed(xml: string) {
  const s = xml.slice(0, 1000).toLowerCase();
  return s.includes("<rss") || s.includes("<feed") || s.includes("<rdf");
}

export async function GET() {
  try {
    const parser = new Parser();

    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
    });

    let inserted = 0;

    async function processFeed(feedUrl: string, sourceName: string) {
      try {
        let xml: string;

        if (sourceName === "444") {
          xml = await proxyRequest(feedUrl);
        } else {
          xml = await fetch(feedUrl).then((r) => r.text());
        }

        xml = aggressiveFixAttributes(xml);

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

            await connection.execute(
              `INSERT INTO articles (title, url_canonical, content_text, published_at, language, source_id, source)
               VALUES (?, ?, ?, NOW(), ?, ?, ?)`,
              [
                item.title || "",
                link,
                item["content:encoded"] || item.content || "",
                "hu",
                sourceId,
                sourceName,
              ]
            );

            inserted++;
          }
        }
      } catch (err) {
        logError(sourceName, err);
      }
    }

    // Feed lista
    await processFeed("https://telex.hu/rss", "Telex");
    await processFeed("https://hvg.hu/rss", "HVG");
    await processFeed("https://24.hu/feed", "24.hu");
    await processFeed("https://index.hu/24ora/rss/", "Index");
    await processFeed("https://444.hu/feed", "444");
    await processFeed("https://www.portfolio.hu/rss/all.xml", "Portfolio");

    await connection.end();

    return NextResponse.json({ status: "ok", inserted });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
