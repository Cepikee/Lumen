"use client";

import Link from "next/link";
import InsightSparkline from "@/components/InsightSparkline";
import InsightSourceRing from "@/components/InsightSourceRing";

type InsightCardProps = {
  title: string;
  category: string;
  score: number;
  sources: number;
  dominantSource: string;
  timeAgo: string;
  href?: string; // <-- hozzáadva
};

export default function InsightCard({
  title,
  category,
  score,
  sources,
  dominantSource,
  timeAgo,
  href
}: InsightCardProps) {
  return (
    <Link href={href || "#"} className="insight-card-link">
      <div className="insight-card">
        <div className="insight-card-header">
          <span className="insight-category">{category}</span>
          <span className="insight-score">{score}</span>
        </div>

        <h3 className="insight-title">{title}</h3>

        {/* Forrásdominancia gyűrű */}
        <InsightSourceRing />

        {/* Sparkline */}
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
