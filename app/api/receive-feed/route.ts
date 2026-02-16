// app/api/receive-feed/route.ts
import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import * as cheerio from "cheerio";
import fs from "fs";

const SECRET = process.env.MY_SERVER_TOKEN || "";

function log(msg: string) {
  try { fs.appendFileSync('/var/www/utom/logs/fetch-feed.log', `[${new Date().toISOString()}] ${msg}\n`); } catch {}
}

export async function POST(request: Request) {
  try {
    const auth = request.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ') || auth.slice(7) !== SECRET) {
      log('receive-feed: unauthorized');
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const xml = await request.text();
    if (!xml || !xml.includes('<rss')) {
      log('receive-feed: invalid payload');
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
    }

    // egyszerű RSS parsing: rss-parser helyett gyors cheerio feldolgozás
    const $ = cheerio.load(xml, { xmlMode: true });
    const items = $('item').toArray().map(i => {
      const el = $(i);
      return {
        title: el.find('title').text() || '',
        link: el.find('link').text() || '',
        content: el.find('encoded').text() || el.find('description').text() || ''
      };
    });

    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
    });

    let inserted = 0;
    for (const it of items) {
      if (!it.link) continue;
      const [rows] = await connection.execute<any[]>("SELECT id FROM articles WHERE url_canonical = ?", [it.link]);
      if (rows.length === 0) {
        const contentText = it.content ? it.content.replace(/\s+/g,' ').trim() : '';
        await connection.execute(
          `INSERT INTO articles (title, url_canonical, content_text, published_at, language, source_id, source)
           VALUES (?, ?, ?, NOW(), ?, ?, ?)`,
          [it.title, it.link, contentText, "hu", 6, "444.hu"]
        );
        inserted++;
      }
    }

    await connection.end();
    log(`receive-feed: inserted ${inserted} items`);
    return NextResponse.json({ status: 'ok', inserted });
  } catch (err: any) {
    log('receive-feed error: ' + String(err));
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
