import crypto from "crypto";
import { cookies } from "next/headers";
import HiradoClient from "@/components/HiradoClient";

// 🔐 Signed URL generálás
function signVideoUrl(videoId: string, userId: string) {
  const secret = process.env.VIDEO_SIGN_SECRET!;
  const ttl = 60; // 60 másodperc érvényesség
  const expires = Math.floor(Date.now() / 1000) + ttl;

  const payload = `${videoId}:${userId}:${expires}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const params = new URLSearchParams({
    v: videoId,
    u: userId,
    e: String(expires),
    s: signature,
  });

  // 🔥 JAVÍTOTT SOR — a videoId bekerül az URL-be
  return `/api/secure/video/${videoId}?${params.toString()}`;
}

export default async function HiradoPage({ searchParams }: any) {
  const params = await searchParams;
  const raw = params?.video;
  const videoId = Array.isArray(raw) ? raw[0] : raw; // 🔥 string marad

  // 🔐 User ID kinyerése a session cookie-ból
  const cookieStore = await cookies(); // 🔥 hibajavítás: await kell
  const sessionUser = cookieStore.get("session_user");

  const userId = sessionUser?.value || null;

  // 🔐 Signed URL generálása
  const videoUrl = userId
    ? signVideoUrl(videoId, userId)
    : `/api/secure/video/${videoId}?debug=true`;

  return <HiradoClient videoId={videoId} videoUrl={videoUrl} />;
}
