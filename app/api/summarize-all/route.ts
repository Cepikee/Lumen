// app/api/summarize-all/route.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";

import { blockedCapabilityResponse } from "@/lib/config/routeGuard";
import { requireInternalWorker } from "@/lib/security/internal-worker";

/**
 * S-02:
 * A hírfeldolgozás csak hitelesített, szerveroldali
 * POST-kéréssel indítható.
 *
 * Egyetlen nyilvános GET-kérés sem indíthat
 * adatbázis-írást vagy fizetős OpenAI-hívást.
 */

const BATCH_SIZE = 10;
const MODEL = "gpt-4o-mini";

const CATEGORIES = [
  "Politika",
  "Sport",
  "Gazdaság",
  "Tech",
  "Kultúra",
  "Egészségügy",
  "Oktatás",
  "Közélet",
] as const;

type Category = (typeof CATEGORIES)[number];

type ArticleRow = RowDataPacket & {
  id: number;
  title: string | null;
  url_canonical: string | null;
  content_text: string | null;
};

type AiResult = {
  short_summary: string;
  detailed_content: string;
  category: Category;
  keywords: string[];
};

function getSourceFromUrl(url: string | null): string {
  if (!url) return "ismeretlen";

  try {
    const host = new URL(url)
      .hostname
      .toLowerCase()
      .replace(/^www\./, "");

    const sources: Record<string, string> = {
      "telex.hu": "telex",
      "index.hu": "index",
      "444.hu": "444",
      "24.hu": "24",
      "hvg.hu": "hvg",
      "portfolio.hu": "portfolio",
      "origo.hu": "origo",
    };

    return sources[host] ?? "ismeretlen";
  } catch {
    return "ismeretlen";
  }
}

function normalizeKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("Az AI nem kulcsszólistát adott vissza.");
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 10);

  return [...new Set(normalized)];
}

function validateAiResult(value: unknown): AiResult {
  if (!value || typeof value !== "object") {
    throw new Error("Az AI válasza nem objektum.");
  }

  const data = value as Record<string, unknown>;

  const shortSummary =
    typeof data.short_summary === "string"
      ? data.short_summary.trim()
      : "";

  const detailedContent =
    typeof data.detailed_content === "string"
      ? data.detailed_content.trim()
      : "";

  const category = data.category;

  if (shortSummary.length < 50) {
    throw new Error(
      "Az AI rövid összefoglalója hiányzik vagy túl rövid."
    );
  }

  if (detailedContent.length < 100) {
    throw new Error(
      "Az AI részletes elemzése hiányzik vagy túl rövid."
    );
  }

  if (
    typeof category !== "string" ||
    !CATEGORIES.some((allowed) => allowed === category)
  ) {
    throw new Error("Az AI érvénytelen kategóriát adott vissza.");
  }

  return {
    short_summary: shortSummary,
    detailed_content: detailedContent,
    category: category as Category,
    keywords: normalizeKeywords(data.keywords),
  };
}

/**
 * Egyetlen OpenAI-hívás készíti el a cikk
 * összefoglalóját, elemzését, kategóriáját és kulcsszavait.
 *
 * Nem használunk Ollamát vagy nyers RSS-szöveges
 * helyettesítő összefoglalót.
 */
async function analyzeArticle(
  title: string,
  content: string
): Promise<AiResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Az OPENAI_API_KEY nincs beállítva.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: MODEL,
          response_format: {
            type: "json_object",
          },
          messages: [
            {
              role: "system",
              content: `
Magyar nyelvű hírszerkesztő asszisztens vagy.

A megadott cikket tényszerűen dolgozd fel.
Ne találj ki tényeket, idézeteket vagy forrásokat.

Kizárólag érvényes JSON-objektumot adj vissza
a következő mezőkkel:

{
  "short_summary": "5–8 mondatos magyar összefoglaló",
  "detailed_content": "3–6 bekezdéses részletes magyar elemzés",
  "category": "az engedélyezett kategóriák egyike",
  "keywords": ["6–10 magyar kulcsszó"]
}

Engedélyezett kategóriák:
Politika, Sport, Gazdaság, Tech, Kultúra,
Egészségügy, Oktatás, Közélet.

Az elemzésben különítsd el a cikkben szereplő
tényeket, állításokat és bizonytalanságokat.

Ha a bemeneti szöveg nem elegendő a megbízható
feldolgozáshoz, ne egészítsd ki kitalált tartalommal.
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

    if (!response.ok) {
      throw new Error(
        `OpenAI API-hiba: HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const answer = data?.choices?.[0]?.message?.content;

    if (typeof answer !== "string" || !answer.trim()) {
      throw new Error("Az OpenAI üres választ adott.");
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(answer);
    } catch {
      throw new Error("Az OpenAI válasza nem érvényes JSON.");
    }

    return validateAiResult(parsed);
  } finally {
    clearTimeout(timeout);
  }
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
  // Jogosultság-ellenőrzés minden más művelet előtt.
  const denied = requireInternalWorker(request);

  if (denied) {
    return denied;
  }

  // A projekt meglévő biztonsági képességkorlátai.
  const blocked = blockedCapabilityResponse([
    "databaseWrite",
    "realAi",
  ]);

  if (blocked) {
    return blocked;
  }

  // Ha nincs OpenAI-kulcs, sem DB-írás, sem feldolgozás
  // nem indulhat el.
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "openai_not_configured" },
      { status: 503 }
    );
  }

  const processed: number[] = [];

  const errors: {
    id: number | null;
    error: string;
  }[] = [];

  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      user: process.env.DB_USER || "utom_app",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "utom_dev",
    });

    /**
     * Csak olyan cikkeket választunk ki, amelyekhez
     * még nem készült el a részletes összefoglaló.
     *
     * A BATCH_SIZE szerveroldali konstans, nem
     * felhasználói bemenet.
     */
    const [articleRows] = await connection.execute<
      ArticleRow[]
    >(
      `
        SELECT
          a.id,
          a.title,
          a.url_canonical,
          a.content_text
        FROM articles a
        LEFT JOIN summaries s
          ON s.article_id = a.id
        WHERE
          (
            s.id IS NULL
            OR s.detailed_content IS NULL
            OR TRIM(s.detailed_content) = ''
          )
          AND a.content_text IS NOT NULL
          AND TRIM(a.content_text) <> ''
        ORDER BY a.published_at DESC
        LIMIT ${BATCH_SIZE}
      `
    );

    if (articleRows.length === 0) {
      return NextResponse.json({
        status: "ok",
        message: "Nincs feldolgozatlan cikk.",
        processedCount: 0,
        processed: [],
        errors: [],
      });
    }

    for (const article of articleRows) {
      const articleId = Number(article.id);

      try {
        if (
          !Number.isSafeInteger(articleId) ||
          articleId <= 0
        ) {
          errors.push({
            id: null,
            error: "Érvénytelen article.id.",
          });

          continue;
        }

        const content = article.content_text?.trim() ?? "";

        if (content.length < 100) {
          errors.push({
            id: articleId,
            error:
              "A cikk szövege túl rövid a részletes feldolgozáshoz.",
          });

          continue;
        }

        const title = article.title?.trim() ?? "";

        /**
         * Az AI-hívás a DB-tranzakción kívül történik.
         * Nem tartunk nyitva tranzakciót a hálózati
         * kérés teljes időtartama alatt.
         */
        const analysis = await analyzeArticle(
          title,
          content
        );

        const source = getSourceFromUrl(
          article.url_canonical
        );

        const trendKeywords = analysis.keywords.join(",");

        await connection.beginTransaction();

        try {
          /**
           * Újból ellenőrizzük, hogy a cikk nem kapott-e
           * közben részletes összefoglalót.
           *
           * A teljes párhuzamos feldolgozás elleni
           * védelemhez később külön worker-lease kell.
           */
          const [existingRows] = await connection.execute<
            RowDataPacket[]
          >(
            `
              SELECT id, detailed_content
              FROM summaries
              WHERE article_id = ?
              FOR UPDATE
            `,
            [articleId]
          );

          if (
            existingRows.length > 0 &&
            typeof existingRows[0].detailed_content ===
              "string" &&
            existingRows[0].detailed_content.trim() !== ""
          ) {
            await connection.rollback();
            continue;
          }

          /**
           * Csak a sikeresen feldolgozott cikk
           * összefoglalóját jelöljük AI-clean állapotúra.
           */
          await connection.execute(
            `
              INSERT INTO summaries (
                article_id,
                url,
                language,
                content,
                detailed_content,
                category,
                plagiarism_score,
                ai_clean,
                source,
                trend_keywords,
                sentiment,
                model_version
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
                url = VALUES(url),
                language = VALUES(language),
                content = VALUES(content),
                detailed_content = VALUES(detailed_content),
                category = VALUES(category),
                ai_clean = VALUES(ai_clean),
                source = VALUES(source),
                trend_keywords = VALUES(trend_keywords),
                model_version = VALUES(model_version)
            `,
            [
              articleId,
              article.url_canonical ?? "",
              "hu",
              analysis.short_summary,
              analysis.detailed_content,
              analysis.category,
              0,
              1,
              source,
              trendKeywords,
              "neutral",
              MODEL,
            ]
          );

          for (const keyword of analysis.keywords) {
            await connection.execute(
              `
                INSERT INTO keywords (
                  article_id,
                  keyword,
                  category,
                  created_at
                )
                VALUES (?, ?, ?, NOW())
              `,
              [
                articleId,
                keyword,
                analysis.category,
              ]
            );

            await connection.execute(
              `
                INSERT INTO trends (
                  keyword,
                  created_at,
                  category,
                  source
                )
                VALUES (?, NOW(), ?, ?)
              `,
              [
                keyword,
                analysis.category,
                source,
              ]
            );
          }

          await connection.commit();

          processed.push(articleId);

          console.log(
            "summarize-all: feldolgozva:",
            articleId
          );
        } catch (databaseError) {
          await connection.rollback();
          throw databaseError;
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        console.error(
          "summarize-all: feldolgozási hiba:",
          articleId,
          message
        );

        errors.push({
          id: articleId,
          error: message,
        });
      }
    }

    return NextResponse.json({
      status: "ok",
      processedCount: processed.length,
      processed,
      errors,
    });
  } catch (error) {
    console.error(
      "summarize-all: végponthiba:",
      error
    );

    return NextResponse.json(
      {
        error: "summarize_all_failed",
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (error) {
        console.error(
          "summarize-all: DB-kapcsolat lezárási hiba:",
          error
        );
      }
    }
  }
}