import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT 
        id, 
        title, 
        date, 
        thumbnail_url
     FROM videos
     WHERE date < CURDATE()
     ORDER BY date DESC
     LIMIT 30`
  );

  const videos = rows.map((v) => ({
    id: v.id,
    title: v.title,
    date: v.date,
    thumbnailUrl: v.thumbnail_url,
  }));

  return NextResponse.json({ videos });
}
