// app/hirado/can-watch/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

// 🔐 Rate limiting bucket (user + IP)
const rateBuckets = new Map();

// 🔐 IP kinyerése
function getIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}

// 🔐 Naplózás
async function logAccess(userId: any, videoId: any, ip: string, status: string) {
  try {
    await db.query(
      "INSERT INTO video_access_logs (user_id, video_id, ip, status) VALUES (?, ?, ?, ?)",
      [userId || 0, videoId || 0, ip || "", status]
    );
  } catch (err) {
    console.error("can-watch log insert failed:", err);
  }
}

export async function GET(req: Request) {
  try {
    const ip = getIp(req);
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId") || 0;

    // 🔐 RATE LIMITING (5 mp alatt max 20 kérés)
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/session_user=([^;]+)/);
    const userId = match ? match[1] : "0";

    const key = `${userId}:${ip}`;
    const now = Date.now();
    const windowMs = 5000;
    const limit = 20;

    let bucket = rateBuckets.get(key) || [];
    bucket = bucket.filter((ts: number) => now - ts < windowMs);
    bucket.push(now);
    rateBuckets.set(key, bucket);

    if (bucket.length > limit) {
      await logAccess(userId, videoId, ip, "denied");
      return NextResponse.json(
        { canWatch: false, reason: "RATE_LIMIT" },
        { status: 429 }
      );
    }

    // 🔐 VIDEO ID ellenőrzés
    if (!videoId || videoId === "undefined") {
      await logAccess(userId, 0, ip, "denied");
      return NextResponse.json(
        { canWatch: false, error: "NO_VIDEO_ID" },
        { status: 400 }
      );
    }

    // 🔐 SESSION ellenőrzés
    if (!match) {
      await logAccess(0, videoId, ip, "denied");
      return NextResponse.json({
        canWatch: false,
        reason: "NOT_LOGGED_IN",
      });
    }

    // 🔐 USER lekérdezés
    const [userRows] = await db.query<RowDataPacket[]>(
      "SELECT id, email, is_premium, last_ip FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!userRows || userRows.length === 0) {
      await logAccess(userId, videoId, ip, "denied");
      return NextResponse.json({
        canWatch: false,
        reason: "INVALID_USER",
      });
    }

    const user = userRows[0];

    // 🔐 IP + SESSION KÖTÉS
    if (user.last_ip && user.last_ip !== ip) {
      await logAccess(userId, videoId, ip, "denied");
      return NextResponse.json(
        { canWatch: false, reason: "IP_MISMATCH" },
        { status: 403 }
      );
    }

    // 🔐 VIDEO létezik?
    const [videoRows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM videos WHERE id = ? LIMIT 1",
      [videoId]
    );

    if (!videoRows || videoRows.length === 0) {
      await logAccess(userId, videoId, ip, "denied");
      return NextResponse.json({
        canWatch: false,
        reason: "NO_VIDEO",
      });
    }

    // 🔐 PRÉMIUM?
    const isPremium =
      user.is_premium === 1 ||
      user.is_premium === "1" ||
      user.is_premium === true;

    if (isPremium) {
      await logAccess(userId, videoId, ip, "allowed");
      return NextResponse.json({
        canWatch: true,
        firstTime: false,
        premiumRequired: false,
      });
    }

    // 🔐 NEM prémium → egyszer nézheti
    const [viewRows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM video_views WHERE user_id = ? AND video_id = ? LIMIT 1",
      [userId, videoId]
    );

    const alreadyViewed = viewRows.length > 0;

    if (alreadyViewed) {
      await logAccess(userId, videoId, ip, "denied");
      return NextResponse.json({
        canWatch: false,
        reason: "PREMIUM_REQUIRED",
      });
    }

    // 🔐 első nézés → engedélyezés
    await db.query(
      "INSERT IGNORE INTO video_views (user_id, video_id) VALUES (?, ?)",
      [userId, videoId]
    );

    await logAccess(userId, videoId, ip, "allowed");

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
