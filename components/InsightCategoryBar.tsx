"use client";

type InsightCategoryBarProps = {
  categories: string[];
  active: string;
  onSelect: (cat: string) => void;
};

export default function InsightCategoryBar({
  categories,
  active,
  onSelect
}: InsightCategoryBarProps) {
  return (
    <div className="insight-category-bar">
      {(Array.isArray(categories) ? categories : [])
        .filter((cat): cat is string => typeof cat === "string" && cat.trim().length > 0)
        .map((cat) => (
        <button
          key={cat}
          className={`insight-category-item ${
            active === cat ? "active" : ""
          }`}
          onClick={() => onSelect(cat)}
        >
          {cat}
        </button>
        ))}
    </div>
  );
}
