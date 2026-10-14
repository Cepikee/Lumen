export default function InsightsEmptyState({ period = "24h" }: { period?: string }) {
  const label = period === "today" ? "a mai napból" : period === "24h" ? "az elmúlt 24 órából" : /^(7|30|90)d$/.test(period) ? `az elmúlt ${parseInt(period, 10)} napból` : "a kiválasztott időszakból";
  return <div className="insights-empty text-center py-4 px-3" role="status"><p>Nincs megjeleníthető adat {label}.</p><small>Ebben az időszakban még nem érkezett elegendő feldolgozott hír.</small></div>;
}
