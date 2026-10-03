import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
    return NextResponse.json(
      { hasVideo: false, error: "NO_VIDEO_ID" },
      { status: 400 }
    );
    }

  // The videos table uses an integer primary key. Reject malformed values
  // before querying so fractional, non-numeric, and unsafe IDs cannot be
  // treated as legitimate lookups.
    if (!/^\d+$/.test(videoId) || !Number.isSafeInteger(Number(videoId)) || Number(videoId) <= 0) {
    return NextResponse.json(
      { hasVideo: false, error: "INVALID_VIDEO_ID" },
      { status: 400 }
    );
    }

    const [rows] = await db.query<RowDataPacket[]>(
    `SELECT 
        id, 
        title, 
        date, 
        thumbnail_url
     FROM videos 
     WHERE id = ? 
     LIMIT 1`,
    [Number(videoId)]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ hasVideo: false });
    }

    const v = rows[0];

    return NextResponse.json({
    hasVideo: true,
    video: {
      id: v.id,
      title: v.title,
      date: v.date,
      thumbnailUrl: v.thumbnail_url || null,
    },
    });
  } catch (error) {
    console.error("HIRADO BY-ID ERROR:", error);
    return NextResponse.json(
      { hasVideo: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
