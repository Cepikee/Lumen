// app/api/summarize/route.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";

import { blockedCapabilityResponse } from "@/lib/config/routeGuard";
import { requireInternalWorker } from "@/lib/security/internal-worker";

const MODEL = "gpt-4o-mini";

type ArticleRow = RowDataPacket & {
  id: number;
  title: string | null;
  content_text: string | null;
};

type SummaryResult = {
  category: string;
  short_summary: string;
};

function validateSummary(value: unknown): SummaryResult {
  if (!value || typeof value !== "object") {
    throw new Error("Az OpenAI válasza nem objektum.");
  }

  const data = value as Record<string, unknown>;

  const category =
    typeof data.category === "string"
      ? data.category.trim()
      : "";

  const shortSummary =
    typeof data.short_summary === "string"
      ? data.short_summary.trim()
      : "";

  if (!category || shortSummary.length < 50) {
    throw new Error(
      "Az OpenAI hiányos kategóriát vagy összefoglalót adott vissza."
    );
  }

  return {
    category,
    short_summary: shortSummary,
  };
}

/**
 * A régi GET-kérés nem indíthat feldolgozást.
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

/**
 * S-02: Kizárólag hitelesített belső POST-kérés
 * indíthat fizetős AI-hívást és adatbázis-írást.
 */
export async function POST(req: Request) {
  // Jogosultság-ellenőrzés még a kérés törzsének
  // feldolgozása és a DB-kapcsolat előtt.
  const denied = requireInternalWorker(req);

  if (denied) {
    return denied;
  }

  // Megtartjuk a projekt képességkorlátait.
  const blocked = blockedCapabilityResponse([
    "databaseWrite",
    "realAi",
  ]);

  if (blocked) {
    return blocked;
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "openai_not_configured" },
      { status: 503 }
    );
  }

  // Bemenet ellenőrzése.
  let articleId: number;

  try {
    const body: unknown = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "invalid_request_body" },
        { status: 400 }
      );
    }

    const suppliedId = (
      body as Record<string, unknown>
    ).articleId;

    if (
      typeof suppliedId !== "number" ||
      !Number.isSafeInteger(suppliedId) ||
      suppliedId <= 0
    ) {
      return NextResponse.json(
        { error: "invalid_article_id" },
        { status: 400 }
      );
    }

    articleId = suppliedId;
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400 }
    );
  }

  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      user: process.env.DB_USER || "utom_app",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "utom_dev",
    });

    // Lekérjük a cikket.
    const [rows] = await connection.execute<ArticleRow[]>(
      `
        SELECT id, title, content_text
        FROM articles
        WHERE id = ?
        LIMIT 1
      `,
      [articleId]
    );

    const article = rows[0];

    if (!article) {
      return NextResponse.json(
        { error: "Nincs ilyen cikk" },
        { status: 404 }
      );
    }

    const title = article.title?.trim() ?? "";
    const content = article.content_text?.trim() ?? "";

    if (!content) {
      return NextResponse.json(
        { error: "A cikk szövege hiányzik." },
        { status: 422 }
      );
    }

    // --- OPENAI SUMMARIZER ---
    // A kérés nem indítja el a régi Ollama-folyamatot.
    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      90000
    );

    let summary: SummaryResult;

    try {
      const openaiRes = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization:
              `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: MODEL,
            response_format: {
              type: "json_object",
            },
            messages: [
              {
                role: "system",
                content: `
Foglalj össze magyarul tényszerűen, 5-8 mondatban.

Adj vissza kizárólag egy érvényes JSON-objektumot
a következő formában:

{
  "category": "…",
  "short_summary": "…"
}

A cikkben nem szereplő tényeket ne találj ki.
Semmi mást ne írj, csak az érvényes JSON-t.
`,
              },
              {
                role: "user",
                content:
                  `Cikk címe: ${title}\n\n` +
                  `Cikk tartalma:\n${content}`,
              },
            ],
          }),
        }
      );

      if (!openaiRes.ok) {
        throw new Error(
          `OpenAI API-hiba: HTTP ${openaiRes.status}`
        );
      }

      const json = await openaiRes.json();

      const answer = json?.choices?.[0]?.message?.content;

      if (typeof answer !== "string" || !answer.trim()) {
        throw new Error(
          "Az OpenAI üres összefoglalót adott vissza."
        );
      }

      const parsed: unknown = JSON.parse(answer);

      summary = validateSummary(parsed);
    } finally {
      clearTimeout(timeout);
    }

    // --- ADATBÁZIS-FRISSÍTÉS ---
    // Az AI sikeres válaszáig nem írunk a DB-be.
    // A két kapcsolódó frissítés közös tranzakcióba kerül.

    await connection.beginTransaction();

    try {
      await connection.execute(
        `
          UPDATE articles
          SET category = ?, short_summary = ?
          WHERE id = ?
        `,
        [
          summary.category,
          summary.short_summary,
          article.id,
        ]
      );

      /**
       * A fő hírolvasó a summaries.content mezőt
       * használja. A már létező részletes elemzést
       * nem írjuk felül.
       *
       * Az ON DUPLICATE KEY UPDATE feltétele,
       * hogy a summaries.article_id egyedi kulcs
       * legyen az adatbázisban.
       */
      await connection.execute(
        `
          INSERT INTO summaries (
            article_id,
            content,
            category,
            model_version
          )
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            content = VALUES(content),
            category = VALUES(category),
            model_version = VALUES(model_version)
        `,
        [
          article.id,
          summary.short_summary,
          summary.category,
          MODEL,
        ]
      );

      await connection.commit();
    } catch (databaseError) {
      await connection.rollback();
      throw databaseError;
    }

    return NextResponse.json({
      status: "ok",
      articleId: article.id,
      category: summary.category,
      short_summary: summary.short_summary,
    });
  } catch (error) {
    console.error(
      "API /summarize hiba:",
      error instanceof Error ? error.message : String(error)
    );

    return NextResponse.json(
      { error: "summarize_failed" },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (error) {
        console.error(
          "API /summarize: DB-kapcsolat lezárási hiba:",
          error
        );
      }
    }
  }
}