import { getSessionUserId } from "@/lib/auth-session";
import crypto from "crypto";
import HiradoClient from "@/components/HiradoClient";
import { db } from "@/lib/db-node";
import { parts } from "@/lib/business-time";

export const dynamic = "force-dynamic";

// 🔐 Signed URL generálás
function signVideoUrl(videoId: number, userId: string) {
  const secret =
  process.env.VIDEO_SIGN_SECRET;

if (!secret || secret.length < 32) {
  throw new Error(
    "VIDEO_SIGN_SECRET nincs beállítva vagy túl rövid."
  );
}
  const ttl = 60;
  const expires = Math.floor(Date.now() / 1000) + ttl;

  const payload = `${videoId}:${userId}:${expires}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const params = new URLSearchParams({
    v: String(videoId),
    u: userId,
    e: String(expires),
    s: signature,
  });

  return `/api/secure/video/${videoId}?${params.toString()}`;
}

export default async function HiradoPage({
  searchParams,
}: {
  searchParams?:
    | { video?: string | string[] }
    | Promise<{ video?: string | string[] }>;
}) {
  const resolvedSearchParams = searchParams && typeof searchParams === "object" && "then" in searchParams
    ? await searchParams
    : searchParams;
  const rawVideo = Array.isArray(resolvedSearchParams?.video)
    ? resolvedSearchParams.video[0]
    : resolvedSearchParams?.video;
  const requestedId = rawVideo && /^\d+$/.test(rawVideo) ? Number(rawVideo) : null;
  const queryResult: any = requestedId && Number.isSafeInteger(requestedId) && requestedId > 0
    ? await db.query(
        "SELECT id, file_url FROM videos WHERE id = ? LIMIT 1",
        [requestedId]
      )
    : await (() => {
        const todayParts = parts(new Date());
        const today = `${todayParts.year}-${String(todayParts.month).padStart(2, "0")}-${String(todayParts.day).padStart(2, "0")}`;
        return db.query(
          "SELECT id, file_url FROM videos WHERE date = ? ORDER BY id DESC LIMIT 1",
          [today]
        );
      })();

  const rows: any[] = Array.isArray(queryResult?.[0]) ? queryResult[0] : [];

  const video = rows[0];
  const videoId = video?.id ?? 0;

  // 🔐 User ID cookie-ból
  const userId = await getSessionUserId();

  // 🔐 Signed URL
  const videoUrl = userId
    ? signVideoUrl(videoId, String(userId))
    : "";

  return <HiradoClient videoId={videoId} videoUrl={videoUrl} />;
}
