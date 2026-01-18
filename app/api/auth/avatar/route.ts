import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/session_user=([^;]+)/);

    if (!match) {
      return NextResponse.json({ success: false, message: "Not logged in" });
    }

    const userId = match[1];

    const body = await req.json();
    const { style, seed, format } = body;

    if (!style || !seed || !format) {
      return NextResponse.json({
        success: false,
        message: "Missing avatar data",
      });
    }

    // 🔥 Avatar mentése az adatbázisba
    await db.query(
      `UPDATE users 
       SET avatar_style = ?, avatar_seed = ?, avatar_format = ?
       WHERE id = ?`,
      [style, seed, format, userId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({
      success: false,
      message: "Server error",
    });
  }
}
