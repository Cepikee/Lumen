import { NextResponse } from "next/server";
import { blockedCapabilityResponse } from "@/lib/config/routeGuard";
import { db } from "@/lib/db";
import { fetchPinnedText } from "@/lib/safe-fetch";

export const runtime = "nodejs";
const FETCH_TIMEOUT_MS = 20_000;

async function fetchExternalArticle(rawUrl: string): Promise<{ url: URL; text: string }> {
  const result = await fetchPinnedText(rawUrl, {
    timeoutMs: FETCH_TIMEOUT_MS,
    maxRedirects: 5,
    maxBytes: 2 * 1024 * 1024,
    headers: { "User-Agent": "UtomBot/1.0 (+https://utom.hu)", Accept: "text/html,text/plain,application/xhtml+xml;q=0.9,*/*;q=0.1" },
  });
  if (!result.text.trim()) throw new Error("A letöltött oldal üres.");
  return { url: result.url, text: result.text };
}

const OLLAMA_TIMEOUT_MS = 180_000;
export async function POST(
  req: Request
) {
  const blocked =
    blockedCapabilityResponse([
      "feedFetch",
      "databaseWrite",
      "realAi",
    ]);

  if (blocked) {
    return blocked;
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error:
          "Érvénytelen JSON kérés.",
      },
      {
        status: 400,
      }
    );
  }

  const url =
    typeof body === "object" &&
    body !== null &&
    "url" in body &&
    typeof (
      body as {
        url?: unknown;
      }
    ).url === "string"
      ? (
          body as {
            url: string;
          }
        ).url.trim()
      : "";

  if (!url) {
    return NextResponse.json(
      {
        error: "Hiányzó URL",
      },
      {
        status: 400,
      }
    );
  }

  let articleUrl: URL;
  let articleText: string;

  try {
    const result =
      await fetchExternalArticle(
        url
      );

    articleUrl = result.url;
    articleText = result.text;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "A cikk letöltése sikertelen.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 400,
      }
    );
  }

  // Az AI-nak nem küldünk korlátlan
  // méretű oldalt.
  const textForAnalysis =
    articleText.slice(
      0,
      100_000
    );

  let ollamaRes: Response;

  try {
    ollamaRes = await fetch(
      "http://127.0.0.1:11434/api/generate",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          model: "llama3",

          prompt:
            "Elemezd és foglald össze ezt a cikket magyarul:\n\n" +
            textForAnalysis,

          stream: false,
        }),

        signal:
          AbortSignal.timeout(
            OLLAMA_TIMEOUT_MS
          ),
      }
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Az elemző szolgáltatás nem érhető el.",
      },
      {
        status: 502,
      }
    );
  }

  if (!ollamaRes.ok) {
    return NextResponse.json(
      {
        error:
          "Az elemző szolgáltatás hibát adott.",
      },
      {
        status: 502,
      }
    );
  }

  let ollamaData: unknown;

  try {
    ollamaData =
      await ollamaRes.json();
  } catch {
    return NextResponse.json(
      {
        error:
          "Érvénytelen válasz érkezett az elemző szolgáltatástól.",
      },
      {
        status: 502,
      }
    );
  }

  const summary =
    typeof ollamaData === "object" &&
    ollamaData !== null &&
    "response" in
      ollamaData &&
    typeof (
      ollamaData as {
        response?: unknown;
      }
    ).response === "string"
      ? (
          ollamaData as {
            response: string;
          }
        ).response.trim()
      : "";

  if (!summary) {
    return NextResponse.json(
      {
        error:
          "Az elemző szolgáltatás üres választ adott.",
      },
      {
        status: 502,
      }
    );
  }

  try {
    await db.query(
      `
        INSERT INTO summaries
          (url, language, content)
        VALUES (?, ?, ?)
      `,
      [
        articleUrl.toString(),
        "hu",
        summary,
      ]
    );
  } catch (error) {
    console.error(
      "analyze: összefoglaló mentési hiba:",
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json(
      { error: "summary_persist_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    summary,
  });
}
