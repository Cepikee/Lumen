"use client";

type InsightFiltersProps = {
  active: string;
  onChange: (filter: string) => void;
};

export default function InsightFilters({ active, onChange }: InsightFiltersProps) {
  const filters = ["Legfrissebb", "Növekvő", "Legtöbb forrás"];

  return (
    <div className="insight-filters">
      {filters.map((f) => (
        <button
          key={f}
          className={`insight-filter-item ${active === f ? "active" : ""}`}
          onClick={() => onChange(f)}
        >
          {f}
        </button>
      ))}
    </div>
  );
}
