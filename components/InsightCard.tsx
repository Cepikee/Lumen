// components/InsightCard.tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useInView } from "@/lib/useInView";
import InsightSparkline from "@/components/InsightSparkline";
import InsightSourceRing from "@/components/InsightSourceRing";

type InsightCardProps = {
  title: string;
  score: number;
  sources: number;
  dominantSource: string;
  timeAgo: string;
  href?: string;
  // opcionális adatok a chartokhoz (ha van)
  ringData?: number[];     // pl. [dominantCount, otherCount]
  sparkline?: number[];    // pl. napi értékek
};

export default function InsightCard({
  title,
  score,
  sources,
  dominantSource,
  timeAgo,
  href,
  ringData,
  sparkline,
}: InsightCardProps) {
  const linkHref = href || "#";
  const disabled = !href;

  // useInView: kisebb threshold, előtöltés (rootMargin) és debounce, egyszeri init
  const { ref, inView } = useInView(0.12);



  // default adatok, ha nincs ringData/sparkline
  const ring = useMemo(
    () => ringData ?? [Math.max(0, score), Math.max(0, sources - score)],
    [ringData, score, sources]
  );
  const spark = useMemo(() => sparkline ?? [], [sparkline]);

  return (
    <article
      ref={ref as any}
      tabIndex={0}
      role="article"
      aria-labelledby={`insight-${title}`}
      className="insight-card card h-100 border-0"
      data-disabled={disabled ? "true" : "false"}
    >
      <div className="card-body d-flex flex-column gap-3">
        <div className="d-flex align-items-start">
          <div className="me-3 d-flex align-items-center" style={{ width: 64, height: 64 }}>
            {inView ? (
              <InsightSourceRing data={ring} aria-hidden="true" />
            ) : (
              <div className="bg-secondary rounded-circle w-100 h-100" />
            )}
          </div>

          <div className="flex-grow-1">
            <h3 id={`insight-${title}`} className="insight-title h6 mb-1">
              {title}
            </h3>

            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary">{sources}</span>
              <small className="text-secondary">{dominantSource}</small>
            </div>

            <div className="mt-2">
              <small className="text-secondary">{timeAgo ?? "Nincs friss cikk"}</small>
            </div>
          </div>

          <div className="ms-2 text-end d-flex flex-column gap-2">
            {href ? (
              <Link href={linkHref} className="btn btn-sm btn-outline-light" aria-label={`Megnyit ${title} kategória`}>
                Megnyit
              </Link>
            ) : (
              <button className="btn btn-sm btn-outline-light" disabled aria-disabled="true">
                Nincs link
              </button>
            )}
          </div>
        </div>

        <div className="card-footer bg-transparent border-0 pt-0">
          {inView ? (
            <InsightSparkline data={spark} aria-hidden="true" />
          ) : (
            <div style={{ height: 40 }} />
          )}
        </div>
      </div>

      <span className="visually-hidden" aria-live="polite">
        {`${title} — ${sources} forrás — trend pontszám ${score}`}
      </span>
    </article>
  );
}
