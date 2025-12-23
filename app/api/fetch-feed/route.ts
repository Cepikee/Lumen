// app/api/fetch-feed/route.tsx
import { NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";
import Parser from "rss-parser";

/** Domain → source_id */
function detectSourceId(url: string | null | undefined): number | null {
  if (!url) return null;
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    switch (domain) {
      case "telex.hu": return 1;
      case "24.hu": return 2;
      case "portfolio.hu": return 3;
      case "hvg.hu": return 4;
      case "index.hu": return 5;
      case "444.hu": return 6;
      default: return null;
    }
  } catch {
    return null;
  }
}

/** Aggresszív attribútumjavítás (idézőjelek beszúrása, on* attrib eltávolítás) */
function aggressiveFixAttributes(xml: string) {
  let out = xml;
  out = out.replace(/(\s(?:src|href|data-src|data-href|poster|srcset|data-srcset)=)(?!["'])([^\s"'>]+)/gi, '$1"$2"');
  out = out.replace(/(\s(on[a-zA-Z]+)=)(["']?)([^"'>\s]+)(["']?)/gi, ''); // eltávolítjuk az on* attribútumokat
  out = out.replace(/\u0000/g, "");
  return out;
}

/** Ha HTML-t kapunk, próbáljuk meg kinyerni az RSS linket */
function extractRssFromHtml(html: string): string | null {
  // keresünk <link rel="alternate" type="application/rss+xml" href="...">
  const linkMatch = html.match(/<link[^>]+rel=["']?alternate["']?[^>]*type=["']?(application\/rss\+xml|application\/atom\+xml|application\/xml|text\/xml)["']?[^>]*>/i);
  if (linkMatch) {
    const hrefMatch = linkMatch[0].match(/href=(["'])(.*?)\1/i);
    if (hrefMatch) return hrefMatch[2];
    const hrefMatch2 = linkMatch[0].match(/href=([^\s>]+)/i);
    if (hrefMatch2) return hrefMatch2[1];
  }
  // alternatív: <a href="...rss"> vagy <a href="/rss">
  const aMatch = html.match(/<a[^>]+href=(["'])([^"']*rss[^"']*)\1/i);
  if (aMatch) return aMatch[2];
  return null;
}

/** Ellenőrzi, hogy a szöveg tartalmaz-e RSS/Atom jellegű elemet */
function looksLikeXmlFeed(xml: string) {
  const s = xml.slice(0, 1000).toLowerCase();
  return s.includes("<rss") || s.includes("<feed") || s.includes("<rdf");
}

export async function GET() {
  console.log(">>> fetch-feed route elindult!");

  try {
    const parser = new Parser({
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FetchBot/1.0)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });

    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
    });

    let inserted = 0;

    async function fetchAndParse(feedUrl: string, fixHtml = false) {
      const res = await fetch(feedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FetchBot/1.0)",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
        redirect: "follow",
      });
      const contentType = res.headers.get("content-type") || "";
      const text = await res.text();
      return { status: res.status, ok: res.ok, contentType, text };
    }

    async function processFeed(
      feedUrl: string,
      sourceName: string,
      forcedSourceId: number | null = null,
      fixHtml = false
    ) {
      try {
        console.log(`>>> processFeed start: ${sourceName} (${feedUrl})`);
        let { status, ok, contentType, text } = await fetchAndParse(feedUrl, fixHtml);
        console.log(`>>> ${sourceName} HTTP ${status} content-type: ${contentType}`);
        // Ha HTML-t kaptunk vagy nem tűnik feednek, próbáljunk kinyerni RSS linket
        if (!ok) throw new Error(`HTTP ${status}`);
        if (!looksLikeXmlFeed(text) || /text\/html|application\/xhtml\+xml/i.test(contentType)) {
          const rssLink = extractRssFromHtml(text);
          if (rssLink) {
            // abszolút URL-re alakítás
            const base = new URL(feedUrl);
            const resolved = rssLink.startsWith("http") ? rssLink : new URL(rssLink, base).toString();
            console.log(`>>> ${sourceName} talált RSS link a HTML-ben: ${resolved}`);
            ({ status, ok, contentType, text } = await fetchAndParse(resolved, fixHtml));
            if (!ok) throw new Error(`HTTP ${status} when fetching discovered RSS`);
          } else {
            throw new Error("Nem talált RSS linket a HTML-ben");
          }
        }

        // Ha fixHtml, próbáljuk meg javítani
        let xml = text;
        if (fixHtml) xml = aggressiveFixAttributes(xml);

        // Első parse próbálkozás
        let feed;
        try {
          feed = await parser.parseString(xml);
        } catch (err) {
          console.warn(`⚠️ ${sourceName} parse hiba (első):`, (err instanceof Error) ? err.message : String(err));
          // második próbálkozás agresszív javítással
          xml = aggressiveFixAttributes(xml);
          try {
            feed = await parser.parseString(xml);
          } catch (err2) {
            console.error(`⚠️ ${sourceName} parse hiba (második):`, (err2 instanceof Error) ? err2.message : String(err2));
            throw err2;
          }
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
            await connection.execute(
              `INSERT INTO articles 
                (title, url_canonical, content_text, published_at, language, source_id)
               VALUES (?, ?, ?, NOW(), ?, ?)`,
              [
                item.title || "",
                link,
                item["content:encoded"] || item.content || item.contentSnippet || "",
                "hu",
                sourceId,
              ]
            );
            inserted++;
            console.log(`🆕 Új ${sourceName} cikk mentve:`, link);
          }
        }
      } catch (err) {
        console.error(`⚠️ ${sourceName} feed hiba:`, err);
      }
    }

    // ---- FEED LISTA ----
    await processFeed("https://telex.hu/rss", "Telex");
    await processFeed("https://hvg.hu/rss", "HVG");
    await processFeed("https://24.hu/feed", "24.hu");
    await processFeed("https://index.hu/24ora/rss/", "Index");
    await processFeed("https://444.hu/feed", "444");

    // Portfolio: forcedSourceId = 3 és fixHtml = true
     await processFeed("https://www.portfolio.hu/rss/all.xml", "Portfolio", 3, true);


    // --- SUMMARIZE-ALL FUTTATÁSA ---
    const BATCH_SIZE = 10;
    const cycles = Math.max(0, Math.ceil(inserted / BATCH_SIZE));

    console.log("===============================================");
    console.log(">>> FETCH-FEED ÖSSZEGZÉS");
    console.log(">>> Új cikkek száma:", inserted);
    console.log(">>> Batch méret:", BATCH_SIZE);
    console.log(">>> Szükséges summarize-all ciklusok:", cycles);
    console.log("===============================================");

    for (let i = 0; i < cycles; i++) {
      console.log(`>>> Summarize-all indítása (${i + 1}/${cycles})...`);
      try {
        await fetch("http://localhost:3000/api/summarize-all", { method: "GET" });
        console.log(`>>> Summarize-all lefutott (${i + 1}/${cycles})`);
      } catch (err) {
        console.error("⚠️ summarize-all hívás hiba:", err);
      }
    }

    console.log(">>> Minden summarize-all ciklus lefutott!");
    await connection.end();
    return NextResponse.json({ status: "ok", inserted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Ismeretlen hiba történt";
    console.error("API /fetch-feed hiba:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
