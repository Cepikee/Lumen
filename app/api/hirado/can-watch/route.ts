import { getSessionUserId } from "@/lib/auth-session";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { evaluatePremium } from "@/lib/entitlements";
import { getIp, requireTrustedOrigin } from "@/lib/security";
import { consumeRateLimitFailClosed } from "@/lib/shared-rate-limit";

async function logAccess(userId: unknown, videoId: unknown, ip: string, status: string) {
  try {
    await db.query(
      "INSERT INTO video_access_logs (user_id, video_id, ip, status) VALUES (?, ?, ?, ?)",
      [userId || 0, videoId || 0, ip || "", status],
    );
  } catch (err) {
    console.error("can-watch log insert failed:", err instanceof Error ? err.message : "unknown_error");
  }
}

export async function POST(req: Request) {
  try {
    const originDenied = requireTrustedOrigin(req);
    if (originDenied) return originDenied;

    const ip = getIp(req);
    const userId = (await getSessionUserId()) || 0;

    const rateAllowed = await consumeRateLimitFailClosed(db, {
      scope: "hirado-can-watch",
      identity: `${userId}:${ip}`,
      limit: 30,
      windowMs: 10_000,
    });
    if (!rateAllowed) {
      await logAccess(userId, 0, ip, "denied");
      return NextResponse.json({ canWatch: false, reason: "RATE_LIMIT" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ canWatch: false, error: "INVALID_REQUEST" }, { status: 400 });
    }
    const rawVideoId = body && typeof body === "object" && "videoId" in body
      ? String((body as { videoId?: unknown }).videoId ?? "").trim()
      : "";

    if (!rawVideoId || !/^\d+$/.test(rawVideoId) || !Number.isSafeInteger(Number(rawVideoId)) || Number(rawVideoId) <= 0) {
      await logAccess(userId, 0, ip, "denied");
      return NextResponse.json(
        { canWatch: false, error: rawVideoId ? "INVALID_VIDEO_ID" : "NO_VIDEO_ID" },
        { status: 400 },
      );
    }
    const videoId = Number(rawVideoId);

    if (!userId) {
      await logAccess(0, videoId, ip, "denied");
      return NextResponse.json({ canWatch: false, reason: "NOT_LOGGED_IN" });
    }

    const [userRows] = await db.query<RowDataPacket[]>(
      "SELECT id, email, is_premium, premium_until, premium_tier, last_ip FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
    if (!userRows.length) {
      await logAccess(userId, videoId, ip, "denied");
      return NextResponse.json({ canWatch: false, reason: "INVALID_USER" });
    }
    const user = userRows[0];

    if (user.last_ip && user.last_ip !== ip) {
      await logAccess(userId, videoId, ip, "denied");
      return NextResponse.json({ canWatch: false, reason: "IP_MISMATCH" }, { status: 403 });
    }

    const [videoRows] = await db.query<RowDataPacket[]>("SELECT id FROM videos WHERE id = ? LIMIT 1", [videoId]);
    if (!videoRows.length) {
      await logAccess(userId, videoId, ip, "denied");
      return NextResponse.json({ canWatch: false, reason: "NO_VIDEO" });
    }

    const isPremium = evaluatePremium(user as unknown as {
      is_premium: unknown;
      premium_until?: unknown;
      premium_tier?: unknown;
    }).active;
    if (isPremium) {
      await logAccess(userId, videoId, ip, "allowed");
      return NextResponse.json({ canWatch: true, firstTime: false, premiumRequired: false });
    }

    // State-changing entitlement consumption is POST-only. INSERT IGNORE is the
    // concurrency boundary: exactly one parallel first-watch request succeeds.
    const [insertResult] = await db.query(
      "INSERT IGNORE INTO video_views (user_id, video_id) VALUES (?, ?)",
      [userId, videoId],
    );
    if (Number((insertResult as { affectedRows?: unknown })?.affectedRows) !== 1) {
      await logAccess(userId, videoId, ip, "denied");
      return NextResponse.json({ canWatch: false, reason: "PREMIUM_REQUIRED" });
    }

    await logAccess(userId, videoId, ip, "allowed");
    return NextResponse.json({ canWatch: true, firstTime: true, premiumRequired: false });
  } catch (err) {
    console.error("CAN WATCH ERROR:", err instanceof Error ? err.message : "unknown_error");
    return NextResponse.json({ canWatch: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
