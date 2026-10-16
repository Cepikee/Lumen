"use client";

import React from "react";
import FeedItemCard from "./FeedItemCard";
import type { FeedItem } from "./FeedItemCard";

type FeedItemLocal = FeedItem;

interface Props {
  items: FeedItemLocal[];
  viewMode: "card" | "compact";
}

export default function FeedList({
  items,
  viewMode,
}: Props) {
  const safeItems = Array.isArray(items) ? items.filter((item) => item && typeof item === "object") : [];
  if (safeItems.length === 0) return <div className="home-feed-empty"><strong>Még nincs megjeleníthető hír.</strong><p>Próbálj másik kategóriát, forrást vagy keresést.</p></div>;

  return (
    <>
      {safeItems.map((item) => (
        <FeedItemCard
          key={item.id}
          item={item}
          viewMode={viewMode}
        />
      ))}
    </>
  );
}
