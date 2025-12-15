"use client";
import TrendsPanel from "./TrendsPanel";

interface Props {
  show: boolean;
  onToggle: () => void;
  trendExpanded: string | null;
  setTrendExpanded: (k: string | null) => void;
}

export default function TrendsSection({
  show,
  onToggle,
  trendExpanded,
  setTrendExpanded,
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
        <TrendsPanel trendExpanded={trendExpanded} setTrendExpanded={setTrendExpanded} />
      ) : (
        <p className="text-muted mb-4">A trendek panel jelenleg zárva van.</p>
      )}
    </>
  );
}
