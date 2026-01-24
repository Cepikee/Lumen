"use client";

import dynamic from "next/dynamic";

const HiradoPlayer = dynamic(() => import("@/components/HiradoPlayer"), {
  ssr: false,
});

export default function HiradoPlayerWrapper({ video }: any) {
  return <HiradoPlayer video={video} />;
}
