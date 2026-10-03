import { getSessionUserId } from "@/lib/auth-session";
// app/hirado/can-watch/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { evaluatePremium } from "@/lib/entitlements";

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
    const rawVideoId = searchParams.get("videoId");

    // 🔐 RATE LIMITING (5 mp alatt max 20 kérés)
    const userId = (await getSessionUserId()) || 0;

    const key = `${userId}:${ip}`;
    const now = Date.now();
    const windowMs = 5000;
    const limit = 20;

    let bucket = rateBuckets.get(key) || [];
    bucket = bucket.filter((ts: number) => now - ts < windowMs);
    bucket.push(now);
    rateBuckets.set(key, bucket);

    if (bucket.length > limit) {
      await logAccess(userId, rawVideoId || 0, ip, "denied");
      return NextResponse.json(
        { canWatch: false, reason: "RATE_LIMIT" },
        { status: 429 }
      );
    }

    // 🔐 VIDEO ID ellenőrzés
    if (!rawVideoId || !/^\d+$/.test(rawVideoId) || !Number.isSafeInteger(Number(rawVideoId)) || Number(rawVideoId) <= 0) {
      await logAccess(userId, 0, ip, "denied");
      return NextResponse.json(
        { canWatch: false, error: rawVideoId ? "INVALID_VIDEO_ID" : "NO_VIDEO_ID" },
        { status: 400 }
      );
    }

    const videoId = Number(rawVideoId);

    // 🔐 SESSION ellenőrzés
    if (!userId) {
      await logAccess(0, videoId, ip, "denied");
      return NextResponse.json({
        canWatch: false,
        reason: "NOT_LOGGED_IN",
      });
    }

    // 🔐 USER lekérdezés
    const [userRows] = await db.query<RowDataPacket[]>(
      "SELECT id, email, is_premium, premium_until, premium_tier, last_ip FROM users WHERE id = ? LIMIT 1",
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
    const isPremium = evaluatePremium(user as unknown as {
      is_premium: unknown;
      premium_until?: unknown;
      premium_tier?: unknown;
    }).active;

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
    const [insertResult] = await db.query(
      "INSERT IGNORE INTO video_views (user_id, video_id) VALUES (?, ?)",
      [userId, videoId]
    );

    // Két párhuzamos első kérés ugyanarra a videóra mindkettője
    // láthatta üresnek a SELECT eredményét. Az INSERT IGNORE csak az
    // egyiknek hoz létre jogosultsági rekordot, ezért a tényleges írás
    // eredménye dönti el, hogy ez valóban az első megtekintés-e.
    if (Number((insertResult as { affectedRows?: unknown })?.affectedRows) !== 1) {
      await logAccess(userId, videoId, ip, "denied");
      return NextResponse.json({
        canWatch: false,
        reason: "PREMIUM_REQUIRED",
      });
    }

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
