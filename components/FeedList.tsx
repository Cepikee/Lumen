"use client";

import React from "react";
import FeedItemCard from "./FeedItemCard";
import type { FeedItem } from "./FeedItemCard";

type FeedItemLocal = FeedItem;

interface Props {
  items: FeedItemLocal[];
  expandedId: number | null;
  setExpandedId: (id: number | null) => void;
  viewMode: "card" | "compact";
}

export default function FeedList({
  items,
  expandedId,
  setExpandedId,
  viewMode,
}: Props) {
  if (!items || items.length === 0) return <p>Nincs még összefoglalás.</p>;

  return (
    <>
      <h2 className="mb-4">📰 Friss hírek</h2>

      {items.map((item) => (
        <FeedItemCard
          key={item.id}
          item={item}
          expanded={expandedId === item.id}
          onToggle={() =>
            setExpandedId(expandedId === item.id ? null : item.id)
          }
          viewMode={viewMode}
        />
      ))}
    </>
  );
}
