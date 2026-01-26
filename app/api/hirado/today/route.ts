import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT 
          id, 
          date, 
          title, 
          description, 
          thumbnail_url
       FROM videos 
       WHERE date = CURDATE() 
       LIMIT 1`
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ hasVideo: false });
    }

    const v = rows[0];

    return NextResponse.json({
      hasVideo: true,
      video: {
        id: v.id,
        date: v.date,
        title: v.title,
        description: v.description,
        thumbnailUrl: v.thumbnail_url || null,
      },
    });

  } catch (err) {
    console.error("HIRADO TODAY ERROR:", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
