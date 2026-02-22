"use client";

import React from "react";
import Link from "next/link";
import DonutChart from "@/components/DonutChart";
import InsightSparkline from "@/components/InsightSparkline";

export type InsightCardProps = {
  title: string;
  score: number;
  sources: number;
  dominantSource: string;
  timeAgo: string;
  href?: string;
  ringSources?: { name: string; percent: number }[];
  sparkline?: number[];
  isDark?: boolean;
};

const InsightCard: React.FC<InsightCardProps> = ({
  title,
  sources,
  dominantSource,
  timeAgo,
  href,
  ringSources = [],
  sparkline = [],
  isDark = false,
}) => {
  const linkHref = href || "#";

  // ⭐ Dark mode színek
  const bgColor = isDark ? "#1a1a1a" : "#ffffff";
  const textColor = isDark ? "#f0f0f0" : "#222222";
  const mutedColor = isDark ? "#bbbbbb" : "#6c757d";
  const borderColor = isDark ? "#333" : "#e5e5e5";

  return (
    <article
      className="p-3 text-center h-100"
      style={{
        borderRadius: 16,
        backgroundColor: bgColor,
        color: textColor,
        border: `1px solid ${borderColor}`,
      }}
    >
      {/* Cím */}
      <h3 className="h6 mb-3" style={{ color: textColor }}>
        {title}
      </h3>

      {/* Donut chart */}
      <div className="d-flex justify-content-center mb-3">
        <DonutChart sources={ringSources} isDark={isDark} />
      </div>

      {/* Metaadatok */}
      <div className="mb-2">
        <span
          className="badge me-2"
          style={{
            backgroundColor: isDark ? "#0d6efd55" : "#0d6efd",
            color: "#fff",
          }}
        >
          {sources} cikk
        </span>

        <small style={{ color: mutedColor }}>{dominantSource}</small>
      </div>

      <small style={{ color: mutedColor }} className="d-block mb-3">
        {timeAgo}
      </small>

      {/* Sparkline */}
      <div className="mb-3">
        <InsightSparkline data={sparkline} isDark={isDark} />
      </div>

      {/* Gomb */}
      <div className="mt-auto">
        <Link
          href={linkHref}
          className="btn btn-sm w-100"
          style={{
            borderColor: isDark ? "#555" : "#0d6efd",
            color: isDark ? "#ddd" : "#0d6efd",
            backgroundColor: "transparent",
          }}
        >
          Megnyit
        </Link>
      </div>
    </article>
  );
};

export default InsightCard;
