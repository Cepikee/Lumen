import crypto from "crypto";
import { cookies } from "next/headers";
import HiradoClient from "@/components/HiradoClient";
import { db } from "@/lib/db-node";

// 🔐 Signed URL generálás
function signVideoUrl(videoId: number, userId: string) {
  const secret = process.env.VIDEO_SIGN_SECRET!;
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

export default async function HiradoPage() {
  // 🔥 Legfrissebb videó lekérése
  const [rows]: any = await db.query(
    "SELECT id, file_url FROM videos ORDER BY date DESC LIMIT 1"
  );

  const video = rows[0];
  const videoId = video.id;

  // 🔐 User ID cookie-ból
  const cookieStore = await cookies();
  const sessionUser = cookieStore.get("session_user");
  const userId = sessionUser?.value || null;

  // 🔐 Signed URL
  const videoUrl = userId
    ? signVideoUrl(videoId, userId)
    : `/api/secure/video/${videoId}?debug=true`;

  return <HiradoClient videoId={videoId} videoUrl={videoUrl} />;
}
