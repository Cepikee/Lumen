// app/hirado/can-watch/route.ts
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

    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/session_user=([^;]+)/);

    if (!match) {
      return NextResponse.json({
        canWatch: false,
        reason: "NOT_LOGGED_IN",
      });
    }

    const userId = match[1];

    const [userRows] = await db.query<RowDataPacket[]>(
      "SELECT id, email, is_premium FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!userRows || userRows.length === 0) {
      return NextResponse.json({
        canWatch: false,
        reason: "INVALID_USER",
      });
    }

    const user = userRows[0];

    const isPremium =
      user.is_premium === 1 ||
      user.is_premium === "1" ||
      user.is_premium === true;

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

    if (isPremium) {
      return NextResponse.json({
        canWatch: true,
        firstTime: false,
        premiumRequired: false,
      });
    }

    const [viewRows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM video_views WHERE user_id = ? AND video_id = ? LIMIT 1",
      [userId, videoId]
    );

    const alreadyViewed = viewRows.length > 0;

    if (alreadyViewed) {
      return NextResponse.json({
        canWatch: false,
        reason: "PREMIUM_REQUIRED",
      });
    }

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
