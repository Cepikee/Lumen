import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse } from "next/server";

import { blockedCapabilityResponse } from "@/lib/config/routeGuard";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const MAX_REDIRECTS = 5;
const MAX_ARTICLE_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;
const OLLAMA_TIMEOUT_MS = 180_000;

function normalizeHostname(hostname: string): string {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/\.$/, "");
}

function isBlockedHostname(hostname: string): boolean {
  const host = normalizeHostname(hostname);

  if (!host) return true;

  if (
    host === "localhost" ||
    host === "localhost.localdomain" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }

  return false;
}

function isBlockedIPv4(address: string): boolean {
  const parts = address.split(".").map(Number);

  if (
    parts.length !== 4 ||
    parts.some(
      (part) =>
        !Number.isInteger(part) ||
        part < 0 ||
        part > 255
    )
  ) {
    return true;
  }

  const [a, b, c, d] = parts;

  // 0.0.0.0/8
  if (a === 0) return true;

  // 10.0.0.0/8
  if (a === 10) return true;

  // 100.64.0.0/10
  if (
    a === 100 &&
    b >= 64 &&
    b <= 127
  ) {
    return true;
  }

  // 127.0.0.0/8
  if (a === 127) return true;

  // 169.254.0.0/16
  if (
    a === 169 &&
    b === 254
  ) {
    return true;
  }

  // 172.16.0.0/12
  if (
    a === 172 &&
    b >= 16 &&
    b <= 31
  ) {
    return true;
  }

  // 192.0.0.0/24
  if (
    a === 192 &&
    b === 0 &&
    c === 0
  ) {
    return true;
  }

  // 192.0.2.0/24
  if (
    a === 192 &&
    b === 0 &&
    c === 2
  ) {
    return true;
  }

  // 192.168.0.0/16
  if (
    a === 192 &&
    b === 168
  ) {
    return true;
  }

  // 198.18.0.0/15
  if (
    a === 198 &&
    (b === 18 || b === 19)
  ) {
    return true;
  }

  // 198.51.100.0/24
  if (
    a === 198 &&
    b === 51 &&
    c === 100
  ) {
    return true;
  }

  // 203.0.113.0/24
  if (
    a === 203 &&
    b === 0 &&
    c === 113
  ) {
    return true;
  }

  // Multicast + reserved
  if (a >= 224) return true;

  // Limited broadcast
  if (
    a === 255 &&
    b === 255 &&
    c === 255 &&
    d === 255
  ) {
    return true;
  }

  return false;
}

function isBlockedIPv6(address: string): boolean {
  const ip = address
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "");

  // Unspecified / loopback
  if (
    ip === "::" ||
    ip === "::1" ||
    ip === "0:0:0:0:0:0:0:0" ||
    ip === "0:0:0:0:0:0:0:1"
  ) {
    return true;
  }

  // IPv4-mapped IPv6
  if (ip.startsWith("::ffff:")) {
    const mapped = ip.slice(
      "::ffff:".length
    );

    if (isIP(mapped) === 4) {
      return isBlockedIPv4(mapped);
    }
  }

  // Unique local fc00::/7
  if (
    ip.startsWith("fc") ||
    ip.startsWith("fd")
  ) {
    return true;
  }

  // Link-local fe80::/10
  if (
    ip.startsWith("fe8") ||
    ip.startsWith("fe9") ||
    ip.startsWith("fea") ||
    ip.startsWith("feb")
  ) {
    return true;
  }

  // Multicast ff00::/8
  if (ip.startsWith("ff")) {
    return true;
  }

  // Documentation prefix
  if (
    ip.startsWith("2001:db8:")
  ) {
    return true;
  }

  return false;
}

function isBlockedIpAddress(
  address: string
): boolean {
  const version = isIP(address);

  if (version === 4) {
    return isBlockedIPv4(address);
  }

  if (version === 6) {
    return isBlockedIPv6(address);
  }

  return true;
}

async function validateRemoteUrl(
  rawUrl: string
): Promise<URL> {
  if (
    typeof rawUrl !== "string" ||
    rawUrl.length === 0 ||
    rawUrl.length > 2048
  ) {
    throw new Error(
      "Érvénytelen URL."
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(
      "Érvénytelen URL."
    );
  }

  if (
    parsed.protocol !== "http:" &&
    parsed.protocol !== "https:"
  ) {
    throw new Error(
      "Csak HTTP vagy HTTPS URL engedélyezett."
    );
  }

  if (
    parsed.username ||
    parsed.password
  ) {
    throw new Error(
      "Hitelesítési adatot tartalmazó URL nem engedélyezett."
    );
  }

  const expectedPort =
    parsed.protocol === "https:"
      ? "443"
      : "80";

  if (
    parsed.port &&
    parsed.port !== expectedPort
  ) {
    throw new Error(
      "Nem szabványos hálózati port nem engedélyezett."
    );
  }

  const hostname =
    normalizeHostname(
      parsed.hostname
    );

  if (
    isBlockedHostname(hostname)
  ) {
    throw new Error(
      "Belső hálózati cím nem engedélyezett."
    );
  }

  // Ha maga a hostname már IP-cím.
  if (isIP(hostname)) {
    if (
      isBlockedIpAddress(hostname)
    ) {
      throw new Error(
        "Belső vagy fenntartott IP-cím nem engedélyezett."
      );
    }

    return parsed;
  }

  let addresses: Array<{
  address: string;
  family: number;
}>;

try {
  addresses = await lookup(
    hostname,
    {
      all: true,
      verbatim: true,
    }
  );
} catch {
  throw new Error(
    "A megadott domain nem oldható fel."
  );
}

  if (
    !Array.isArray(addresses) ||
    addresses.length === 0
  ) {
    throw new Error(
      "A megadott domainhez nem található IP-cím."
    );
  }

  for (const result of addresses) {
    if (
      isBlockedIpAddress(
        result.address
      )
    ) {
      throw new Error(
        "A domain belső vagy fenntartott IP-címre mutat."
      );
    }
  }

  return parsed;
}

async function readResponseWithLimit(
  response: Response
): Promise<string> {
  const contentLength =
    response.headers.get(
      "content-length"
    );

  if (contentLength) {
    const parsedLength =
      Number(contentLength);

    if (
      Number.isFinite(
        parsedLength
      ) &&
      parsedLength >
        MAX_ARTICLE_BYTES
    ) {
      throw new Error(
        "A letöltött tartalom túl nagy."
      );
    }
  }

  if (!response.body) {
    return "";
  }

  const reader =
    response.body.getReader();

  const decoder =
    new TextDecoder();

  let received = 0;
  let text = "";

  while (true) {
    const {
      done,
      value,
    } = await reader.read();

    if (done) break;

    received += value.byteLength;

    if (
      received >
      MAX_ARTICLE_BYTES
    ) {
      await reader.cancel();

      throw new Error(
        "A letöltött tartalom túl nagy."
      );
    }

    text += decoder.decode(
      value,
      {
        stream: true,
      }
    );
  }

  text += decoder.decode();

  return text;
}

async function fetchExternalArticle(
  rawUrl: string
): Promise<{
  url: URL;
  text: string;
}> {
  let currentUrl =
    await validateRemoteUrl(
      rawUrl
    );

  for (
    let redirectCount = 0;
    redirectCount <=
    MAX_REDIRECTS;
    redirectCount++
  ) {
    const response = await fetch(
      currentUrl,
      {
        method: "GET",

        redirect: "manual",

        cache: "no-store",

        headers: {
          "User-Agent":
            "UtomBot/1.0 (+https://utom.hu)",
          Accept:
            "text/html,text/plain,application/xhtml+xml;q=0.9,*/*;q=0.1",
        },

        signal:
          AbortSignal.timeout(
            FETCH_TIMEOUT_MS
          ),
      }
    );

    if (
      response.status >= 300 &&
      response.status < 400
    ) {
      const location =
        response.headers.get(
          "location"
        );

      if (!location) {
        throw new Error(
          "Hibás HTTP átirányítás."
        );
      }

      if (
        redirectCount >=
        MAX_REDIRECTS
      ) {
        throw new Error(
          "Túl sok HTTP átirányítás."
        );
      }

      const redirectedUrl =
        new URL(
          location,
          currentUrl
        );

      // MINDEN átirányítás után
      // újra teljes SSRF-ellenőrzés.
      currentUrl =
        await validateRemoteUrl(
          redirectedUrl.toString()
        );

      continue;
    }

    if (!response.ok) {
      throw new Error(
        `A cikk letöltése sikertelen: HTTP ${response.status}`
      );
    }

    const contentType =
      (
        response.headers.get(
          "content-type"
        ) || ""
      ).toLowerCase();

    if (
      contentType &&
      !contentType.includes(
        "text/html"
      ) &&
      !contentType.includes(
        "text/plain"
      ) &&
      !contentType.includes(
        "application/xhtml+xml"
      ) &&
      !contentType.includes(
        "application/xml"
      )
    ) {
      throw new Error(
        "A megadott URL nem támogatott szöveges tartalmat adott vissza."
      );
    }

    const text =
      await readResponseWithLimit(
        response
      );

    if (!text.trim()) {
      throw new Error(
        "A letöltött oldal üres."
      );
    }

    return {
      url: currentUrl,
      text,
    };
  }

  throw new Error(
    "Túl sok HTTP átirányítás."
  );
}

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

  return NextResponse.json({
    summary,
  });
}