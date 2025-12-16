"use client";
import TrendsPanel from "@/components/TrendsPanel";

interface Props {
  show: boolean;
  onToggle: () => void;
  filters: any; // vagy pontosan a Filters típus, ha exportálva van
}

export default function TrendsSection({
  show,
  onToggle,
  filters,
}: Props) {
  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">🔥 Trendek</h2>
        <button className="btn btn-sm btn-outline-primary" onClick={onToggle}>
          {show ? "🔽 Panel bezárása" : "📈 Panel megnyitása"}
        </button>
      </div>

      {show ? (
        <TrendsPanel filters={filters} />
      ) : (
        <p className="text-muted mb-4">A trendek panel jelenleg zárva van.</p>
      )}
    </>
  );
}
