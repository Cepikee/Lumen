// components/InsightCard.tsx
"use client";

import Link from "next/link";
import InsightSparkline from "@/components/InsightSparkline";
import InsightSourceRing from "@/components/InsightSourceRing";

type InsightCardProps = {
  title: string;
  score: number;
  sources: number;
  dominantSource: string;
  timeAgo: string;
  href?: string;
};

export default function InsightCard({
  title,
  score,
  sources,
  dominantSource,
  timeAgo,
  href,
}: InsightCardProps) {
  const linkHref = href || "#";
  const disabled = !href;
  return (
    <Link href={linkHref} className="insight-card-link" aria-disabled={disabled}>
      <div className="insight-card" data-disabled={disabled ? "true" : "false"}>
        <div className="insight-card-header">
          <span className="insight-score">{score}</span>
        </div>

        <h3 className="insight-title">{title}</h3>

        <InsightSourceRing />

        <InsightSparkline trend={[1, 3, 2, 4, 3, 5]} />

        <div className="insight-meta">
          <span>{sources} forrás</span>
          <span>Domináns: {dominantSource}</span>
          <span>{timeAgo}</span>
        </div>
      </div>
    </Link>
  );
}
