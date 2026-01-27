"use client";

import dynamic from "next/dynamic";
import type { HiradoPlayerProps } from "@/components/HiradoPlayer";

const HiradoPlayer = dynamic<HiradoPlayerProps>(
  () => import("@/components/HiradoPlayer"),
  { ssr: false }
);

export default function HiradoPlayerWrapper({
  video,
  isPremium,
  videoUrl,
}: HiradoPlayerProps) {
  return (
    <HiradoPlayer
      video={video}
      isPremium={isPremium}
      videoUrl={videoUrl}
    />
  );
}
