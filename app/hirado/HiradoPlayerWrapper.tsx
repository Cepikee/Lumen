"use client";

import dynamic from "next/dynamic";

const HiradoPlayer = dynamic(() => import("@/components/HiradoPlayer"), {
  ssr: false,
});

export default function HiradoPlayerWrapper({
  video,
  isPremium,
  videoUrl,
}: {
  video: any;
  isPremium: boolean;
  videoUrl: string;
}) {
  return (
    <HiradoPlayer
      video={video}
      isPremium={isPremium}
      videoUrl={videoUrl} // 🔥 TOVÁBBADJUK A SIGNED URL-T
    />
  );
}
