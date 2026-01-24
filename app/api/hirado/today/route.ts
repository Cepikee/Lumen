import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT id, date, title, description, file_url FROM videos WHERE date = CURDATE() LIMIT 1"
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ hasVideo: false });
    }

    const video = rows[0] as RowDataPacket;

    return NextResponse.json({
      hasVideo: true,
      video: {
        id: video.id,
        date: video.date,
        title: video.title,
        description: video.description,
        fileUrl: video.file_url.replace("/var/www/utom/public", "")
      }
    });

  } catch (err) {
    console.error("HIRADO TODAY ERROR:", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
