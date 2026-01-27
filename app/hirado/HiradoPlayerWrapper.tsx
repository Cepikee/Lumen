"use client";

import dynamic from "next/dynamic";
import type { HiradoPlayerProps } from "@/components/HiradoPlayer";

const HiradoPlayer = dynamic(
  () => import("@/components/HiradoPlayer"),
  { ssr: false }
);

export default function HiradoPlayerWrapper(props: HiradoPlayerProps) {
  return <HiradoPlayer {...props} />;
}
