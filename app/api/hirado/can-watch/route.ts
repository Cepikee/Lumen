import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json({ error: "NO_VIDEO_ID" }, { status: 400 });
    }

    // 1) USER ID COOKIE-BÓL
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/session_user=([^;]+)/);

    if (!match) {
      return NextResponse.json({ canWatch: false, reason: "NOT_LOGGED_IN" });
    }

    const userId = match[1];

    // 2) USER LEKÉRÉSE A DB-BŐL
    const [userRows] = await db.query<RowDataPacket[]>(
      "SELECT id, is_premium FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!userRows || userRows.length === 0) {
      return NextResponse.json({ canWatch: false, reason: "INVALID_USER" });
    }

    const user = userRows[0];
    const isPremium = user.is_premium === 1;

    // 3) VIDEÓ LÉTEZIK-E?
    const [videoRows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM videos WHERE id = ? LIMIT 1",
      [videoId]
    );

    if (!videoRows || videoRows.length === 0) {
      return NextResponse.json({ canWatch: false, reason: "NO_VIDEO" });
    }

    // 4) NÉZTE-E MÁR?
    const [viewRows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM video_views WHERE user_id = ? AND video_id = ? LIMIT 1",
      [userId, videoId]
    );

    const alreadyViewed = viewRows.length > 0;

    // 5) HA MÉG NEM NÉZTE → ENGEDJÜK + BEÍRJUK
    if (!alreadyViewed) {
      await db.query(
        "INSERT INTO video_views (user_id, video_id) VALUES (?, ?)",
        [userId, videoId]
      );

      return NextResponse.json({
        canWatch: true,
        firstTime: true,
        premiumRequired: false
      });
    }

    // 6) HA MÁR NÉZTE → CSAK PRÉMIUM
    if (!isPremium) {
      return NextResponse.json({
        canWatch: false,
        reason: "PREMIUM_REQUIRED"
      });
    }

    // 7) PRÉMIUM USER → BÁRMIKOR NÉZHETI
    return NextResponse.json({
      canWatch: true,
      firstTime: false,
      premiumRequired: true
    });

  } catch (err) {
    console.error("CAN WATCH ERROR:", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
