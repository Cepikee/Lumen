import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { checkPublicApiRateLimit } from "@/lib/security";

export async function GET(req: Request) {
  if (!await checkPublicApiRateLimit(req, "hirado-archive", 120, 60_000)) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
          id,
          title,
          date,
          thumbnail_url
       FROM videos
       ORDER BY date DESC, id DESC
       LIMIT 30`
    );

    const videos = rows.map((v) => ({
      id: v.id,
      title: v.title,
      date: v.date,
      thumbnailUrl: v.thumbnail_url || null,
    }));

    return NextResponse.json({ videos });
  } catch (error) {
    console.error("HIRADO ARCHIVE ERROR:", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

