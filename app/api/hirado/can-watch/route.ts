import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json(
        { canWatch: false, error: "NO_VIDEO_ID" },
        { status: 400 }
      );
    }

    // 1) USER AZONOSÍTÁS – session_user cookie
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/session_user=([^;]+)/);

    if (!match) {
      return NextResponse.json({
        canWatch: false,
        reason: "NOT_LOGGED_IN",
      });
    }

    const userId = match[1];

    // 2) USER VALIDÁLÁS
    const [userRows] = await db.query<RowDataPacket[]>(
      "SELECT id, is_premium FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!userRows || userRows.length === 0) {
      return NextResponse.json({
        canWatch: false,
        reason: "INVALID_USER",
      });
    }

    const user = userRows[0];

    // 🔥 VÉGLEGES PRÉMIUM LOGIKA — MINDENT KEZEL
    const isPremium =
      user.is_premium === 1 ||
      user.is_premium === "1" ||
      user.is_premium === true;

    // 3) VIDEÓ LÉTEZIK-E?
    const [videoRows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM videos WHERE id = ? LIMIT 1",
      [videoId]
    );

    if (!videoRows || videoRows.length === 0) {
      return NextResponse.json({
        canWatch: false,
        reason: "NO_VIDEO",
      });
    }

    // 4) PRÉMIUM USER → BÁRMIKOR NÉZHETI
    if (isPremium) {
      return NextResponse.json({
        canWatch: true,
        firstTime: false,
        premiumRequired: false,
      });
    }

    // 5) NEM PRÉMIUM USER – NÉZTE-E MÁR EZT A VIDEÓT?
    const [viewRows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM video_views WHERE user_id = ? AND video_id = ? LIMIT 1",
      [userId, videoId]
    );

    const alreadyViewed = viewRows.length > 0;

    // 6) HA MÁR NÉZTE → AZONNALI TILTÁS
    if (alreadyViewed) {
      return NextResponse.json({
        canWatch: false,
        reason: "PREMIUM_REQUIRED",
      });
    }

    // 7) HA MÉG NEM NÉZTE → BEJEGYEZZÜK, HOGY MOST NÉZI ELŐSZÖR
    await db.query(
      "INSERT IGNORE INTO video_views (user_id, video_id) VALUES (?, ?)",
      [userId, videoId]
    );

    return NextResponse.json({
      canWatch: true,
      firstTime: true,
      premiumRequired: false,
    });
  } catch (err) {
    console.error("CAN WATCH ERROR:", err);
    return NextResponse.json(
      { canWatch: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
