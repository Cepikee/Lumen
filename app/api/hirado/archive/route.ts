import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT 
        id, 
        title, 
        date, 
        file_url,
        thumbnail_url
     FROM videos
     WHERE date < CURDATE()
     ORDER BY date DESC
     LIMIT 30`
  );

  // 🔥 Átalakítjuk a mezőket frontend-barát formára
  const videos = rows.map((v) => ({
    id: v.id,
    title: v.title,
    date: v.date,

    // 🔥 file_url → fileUrl + abszolút path levágása
    fileUrl: v.file_url?.replace("/var/www/utom/public", ""),

    // 🔥 thumbnail_url → thumbnailUrl
    thumbnailUrl: v.thumbnail_url,
  }));

  return NextResponse.json({ videos });
}
