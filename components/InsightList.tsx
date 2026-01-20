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
  href: string;
};

type InsightListProps = {
  items: InsightItem[];
  loading?: boolean;
};

export default function InsightList({ items, loading }: InsightListProps) {
  if (loading) {
    return (
      <div className="insight-list">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="insight-skeleton"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="insight-list">
      {items.map((item) => (
        <InsightCard
          key={item.id}
          title={item.title}
          score={item.score}
          sources={item.sources}
          dominantSource={item.dominantSource}
          timeAgo={item.timeAgo}
          href={item.href}
        />
      ))}
    </div>
  );
}
