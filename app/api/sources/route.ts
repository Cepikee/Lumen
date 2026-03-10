// app/api/sources/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";

export const dynamic = "force-dynamic";

// Normalizáló SQL függvény (domain → mag)
const NORMALIZE = `
  LOWER(
    REPLACE(
      REPLACE(
        REPLACE(su.source, 'www.', ''),
      '.hu', ''),
    '/', '')
  )
`;

const NORMALIZE_SRC = `
  LOWER(
    REPLACE(
      REPLACE(
        REPLACE(s.name, 'www.', ''),
      '.hu', ''),
    '/', '')
  )
`;

export async function GET(req: Request) {
  try {
    // Biztonsági ellenőrzés
    const sec = securityCheck(req);
    if (sec) return sec;

    // Csak létező, valós források lekérése
    const [rows]: any = await db.query(
      `
      SELECT DISTINCT s.id, s.name
      FROM sources s
      JOIN summaries su
        ON ${NORMALIZE} = ${NORMALIZE_SRC}
      ORDER BY s.name ASC
      `
    );

    return NextResponse.json({
      success: true,
      sources: rows
    });

  } catch (err) {
    console.error("API /sources error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
