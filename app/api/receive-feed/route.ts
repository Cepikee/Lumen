// app/api/receive-feed/route.ts

export const runtime = "nodejs";

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";
import * as cheerio from "cheerio";

/**
 * S-02 – külső RSS-fogadó végpont.
 *
 * Csak hitelesített POST-kérést fogad.
 * Nem indít OpenAI-hívást.
 * Az új cikkeket pending állapotban menti.
 */

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_ITEMS = 100;
const MAX_TITLE_LENGTH = 500;
const MAX_CONTENT_LENGTH = 100_000;

const ALLOWED_HOSTS = new Set(["444.hu", "www.444.hu"]);

type FeedItem = {
  title: string;
  link: string;
  content: string;
};

function unauthorized() {
  return NextResponse.json(
    { error: "unauthorized" },
    { status: 401 }
  );
}

function requireFeedToken(request: Request): NextResponse | null {
  const configured = process.env.MY_SERVER_TOKEN;

  // Nincs beállított titok → a végpont nem használható.
  if (!configured || configured.length < 32) {
    return NextResponse.json(
      { error: "feed_receiver_unavailable" },
      { status: 503 }
    );
  }

  const authorization = request.headers.get("authorization") ?? "";

  if (!authorization.startsWith("Bearer ")) {
    return unauthorized();
  }

  const supplied = authorization.slice(7);

  const expectedBytes = Buffer.from(configured, "utf8");
  const suppliedBytes = Buffer.from(supplied, "utf8");

  if (
    expectedBytes.length !== suppliedBytes.length ||
    !timingSafeEqual(expectedBytes, suppliedBytes)
  ) {
    return unauthorized();
  }

  return null;
}

function isAllowedArticleUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      ALLOWED_HOSTS.has(url.hostname.toLowerCase()) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseFeed(xml: string): FeedItem[] {
  const $ = cheerio.load(xml, {
    xmlMode: true,
  });

  return $("item")
    .toArray()
    .slice(0, MAX_ITEMS)
    .map((item) => {
      const element = $(item);

      return {
        title: normalizeText(element.find("title").first().text()).slice(
          0,
          MAX_TITLE_LENGTH
        ),
        link: element.find("link").first().text().trim(),
        content: normalizeText(
          element.find("encoded").first().text() ||
            element.find("description").first().text() ||
            ""
        ).slice(0, MAX_CONTENT_LENGTH),
      };
    })
    .filter((item) => isAllowedArticleUrl(item.link));
}

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

export async function POST(request: Request) {
  // Jogosultság-ellenőrzés az adatfeldolgozás és a DB-kapcsolat előtt.
  const denied = requireFeedToken(request);

  if (denied) {
    return denied;
  }

  // Korlátozzuk a beküldött adatok méretét.
  const declaredLength = request.headers.get("content-length");

  if (declaredLength !== null) {
    const length = Number(declaredLength);

    if (
      !Number.isSafeInteger(length) ||
      length < 0 ||
      length > MAX_BODY_BYTES
    ) {
      return NextResponse.json(
        { error: "payload_too_large" },
        { status: 413 }
      );
    }
  }

  let xml: string;

  try {
    xml = await request.text();
  } catch {
    return NextResponse.json(
      { error: "invalid_payload" },
      { status: 400 }
    );
  }

  if (Buffer.byteLength(xml, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "payload_too_large" },
      { status: 413 }
    );
  }

  if (!/<rss(?:\s|>)/i.test(xml)) {
    return NextResponse.json(
      { error: "invalid_rss" },
      { status: 400 }
    );
  }

  const items = parseFeed(xml);

  if (items.length === 0) {
    return NextResponse.json({
      status: "ok",
      inserted: 0,
      message: "Nincs feldolgozható 444.hu-cikk a feedben.",
    });
  }

  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      user: process.env.DB_USER || "utom_app",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "utom_dev",
    });

    let inserted = 0;

    for (const item of items) {
      const [existingRows] = await connection.execute<RowDataPacket[]>(
        `
          SELECT id
          FROM articles
          WHERE url_canonical = ?
          LIMIT 1
        `,
        [item.link]
      );

      if (existingRows.length > 0) {
        continue;
      }

      await connection.execute(
        `
          INSERT INTO articles (
            title,
            url_canonical,
            content_text,
            published_at,
            language,
            source_id,
            source,
            status
          )
          VALUES (?, ?, ?, NOW(), ?, ?, ?, 'pending')
        `,
        [
          item.title,
          item.link,
          item.content,
          "hu",
          6,
          "444.hu",
        ]
      );

      inserted++;
    }

    return NextResponse.json({
      status: "ok",
      inserted,
      received: items.length,
    });
  } catch (error) {
    console.error(
      "receive-feed: feldolgozási hiba:",
      error instanceof Error ? error.message : String(error)
    );

    return NextResponse.json(
      { error: "receive_feed_failed" },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (error) {
        console.error(
          "receive-feed: DB-kapcsolat lezárási hiba:",
          error
        );
      }
    }
  }
}