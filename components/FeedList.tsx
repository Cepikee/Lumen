"use client";

import FeedItemCard from "./FeedItemCard";

interface FeedItem {
  id: number;
  url: string;
  source: string;
  content: string;
  detailed_content: string;
  ai_clean: number;
  created_at: string;
}


interface Props {
  items: FeedItem[];
  expandedId: number | null;
  setExpandedId: (id: number | null) => void;
}

export default function FeedList({ items, expandedId, setExpandedId }: Props) {
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
        />
      ))}
    </>
  );
}
