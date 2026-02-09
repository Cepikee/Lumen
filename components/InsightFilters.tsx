"use client";

type InsightFiltersProps = {
  active: string;
  onChange: (filter: string) => void;
};

export default function InsightFilters({ active, onChange }: InsightFiltersProps) {
  const filters = ["Legfrissebb", "Növekvő", "Legtöbb forrás"];

  return (
    <div className="insights-filter-group">
      {filters.map((f) => (
        <button
          key={f}
          className={`insights-filter-btn ${active === f ? "active" : ""}`}
          onClick={() => onChange(f)}
        >
          {f}
        </button>
      ))}
    </div>
  );
}
