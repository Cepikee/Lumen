export default function InsightsEmptyState({ period = "24h" }: { period?: string }) {
  const windowLabel = period === "24h" ? "az elmúlt 24 órából" : `az elmúlt ${parseInt(period, 10)} napból`;
  return <div className="text-center py-4 px-3" role="status">
    <p className="fw-semibold mb-1">Nincs megjeleníthető adat {windowLabel}.</p>
    <p className="small text-muted mb-0">Ebben az időszakban még nem érkezett elegendő feldolgozott hír.</p>
  </div>;
}
