import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT id, date, title, file_url FROM videos ORDER BY date DESC LIMIT 30"
    );

    return NextResponse.json(rows);
  } catch (err) {
    console.error("ARCHIVE ERROR:", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
