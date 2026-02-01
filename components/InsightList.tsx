// components/InsightList.tsx
"use client";

import InsightCard from "@/components/InsightCard";

type InsightItem = {
  id: string;
  title: string;
  score: number;
  sources: number;
  dominantSource: string;
  timeAgo: string;
  href?: string;
  ringSources?: { name: string; percent: number }[]; // ÚJ
  // opcionális vizualizációs adatok (backendből jöhetnek)
  sparkline?: number[];
};

type InsightListProps = {
  items: InsightItem[];
  loading?: boolean;
};

export default function InsightList({ items, loading }: InsightListProps) {
  if (loading) {
    // Skeleton grid: ugyanaz a grid struktúra, mint a tényleges kártyáknál
    return (
      <div className="row g-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="col-12 col-sm-6 col-lg-4">
            <div className="card bg-dark text-light h-100 border-0 placeholder-glow">
              <div className="card-body">
                <div className="d-flex gap-3 align-items-start">
                  <div style={{ width: 64, height: 64 }} className="bg-secondary rounded-circle" />
                  <div className="flex-grow-1">
                    <h3 className="placeholder col-6 mb-2" style={{ height: 18 }} />
                    <p className="placeholder col-4 mb-1" style={{ height: 12 }} />
                    <div className="placeholder col-3" style={{ height: 12 }} />
                  </div>
                </div>
                <div style={{ height: 40, marginTop: 12 }} className="placeholder col-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="row g-3">
      {items.map((item) => (
        <div key={item.id} className="col-12 col-sm-6 col-lg-4 d-flex">
          <InsightCard
            title={item.title}
            score={item.score}
            sources={item.sources}
            dominantSource={item.dominantSource}
            timeAgo={item.timeAgo}
            href={item.href}
            ringSources={item.ringSources}
            sparkline={item.sparkline}
          />
        </div>
      ))}
    </div>
  );
}
