"use client";

import Link from "next/link";
import DonutChart from "@/components/DonutChart";
import InsightSparkline from "@/components/InsightSparkline";

type InsightCardProps = {
  title: string;
  score: number;
  sources: number;
  dominantSource: string;
  timeAgo: string;
  href?: string;
  ringSources?: { name: string; percent: number }[];
  sparkline?: number[];
};

export default function InsightCard({
  title,
  sources,
  dominantSource,
  timeAgo,
  href,
  ringSources = [],
  sparkline = [],
  isDark,
}: InsightCardProps) {
  const linkHref = href || "#";

  return (
    <article
      className="card border-0 shadow-sm p-3 text-center h-100"
      style={{ borderRadius: 16 }}
    >
      {/* Cím */}
      <h3 className="h6 mb-3">{title}</h3>

      {/* Donut chart */}
      <div className="d-flex justify-content-center mb-3">
        <DonutChart sources={ringSources} />
      </div>

      {/* Metaadatok */}
      <div className="mb-2">
        <span className="badge bg-primary me-2">{sources} cikk</span>
        <small className="text-muted">{dominantSource}</small>
      </div>

      <small className="text-muted d-block mb-3">{timeAgo}</small>

      {/* Sparkline */}
      <div className="mb-3">
        <InsightSparkline data={sparkline} />
      </div>

      {/* Gomb */}
      <div className="mt-auto">
        <Link href={linkHref} className="btn btn-outline-primary btn-sm w-100">
          Megnyit
        </Link>
      </div>
    </article>
  );
}
