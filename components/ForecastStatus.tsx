import { useEffect, useState } from "react";

type ForecastStatusResponse = {
  status: "running" | "waiting" | "error" | "unknown";
  lastRun: string | Date | null;
  nextRun: string | Date | null;
};

export default function ForecastStatus() {
  const [data, setData] = useState<ForecastStatusResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    let requestSequence = 0;

    const load = async () => {
      const requestId = ++requestSequence;
      try {
        const res = await fetch("/api/forecast-status");
        if (!res.ok) throw new Error(`forecast_status_${res.status}`);
        const json = await res.json();
        const allowed = new Set(["running", "waiting", "error", "unknown"]);
        if (!mounted || requestId !== requestSequence) return;
        setData({
          status: allowed.has(json?.status) ? json.status : "unknown",
          lastRun: json?.lastRun ?? null,
          nextRun: json?.nextRun ?? null,
        });
      } catch {
        if (!mounted || requestId !== requestSequence) return;
        setData({
          status: "error",
          lastRun: null,
          nextRun: null,
        });
      }
    };

    load();
    const interval = setInterval(load, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!data) return null;

  const { status, lastRun, nextRun } = data;

  const colors: Record<string, string> = {
    running: "bg-success",
    waiting: "bg-warning",
    error: "bg-danger",
    unknown: "bg-secondary",
  };

  const labels: Record<string, string> = {
    running: "Az AI előrejelzés éppen dolgozik",
    waiting: "Az AI előrejelzés jelenleg várakozik a következő futásra",
    error: "Az AI előrejelzés hibába futott",
    unknown: "Az AI előrejelzés még nem futott le",
  };

  return (
    <div className="d-flex align-items-center gap-3 mt-3">

      <div
        className={`rounded-circle ${colors[status]}`}
        style={{ width: 12, height: 12 }}
      />

      <div className="d-flex align-items-center flex-wrap gap-3">

        <span className="fw-semibold">{labels[status]}</span>

        {lastRun && (
          <span className="text-muted small">
            • Utolsó futás: {Number.isNaN(new Date(lastRun).getTime()) ? "—" : new Date(lastRun).toLocaleString()}
          </span>
        )}

        {nextRun && (
          <span className="text-muted small">
            • Következő futás: {Number.isNaN(new Date(nextRun).getTime()) ? "—" : new Date(nextRun).toLocaleString()}
          </span>
        )}

      </div>
    </div>
  );
}
