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
        thumbnail_url   -- 🔥 fontos: ezt is visszaadjuk
     FROM videos
     WHERE date < CURDATE()
     ORDER BY date DESC
     LIMIT 30`
  );

  return NextResponse.json({ videos: rows });
}
