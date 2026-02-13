import { useEffect, useState } from "react";

type ForecastStatusResponse = {
  status: "running" | "waiting" | "error" | "unknown";
  lastRun: string | null;
  nextRun: string | null;
};

export default function ForecastStatus() {
  const [data, setData] = useState<ForecastStatusResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/forecast-status");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Status fetch error:", err);
        setData({
          status: "error",
          lastRun: null,
          nextRun: null,
        });
      }
    };

    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
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
    running: "AI éppen dolgozik",
    waiting: "Várakozik a következő futásra",
    error: "Hiba történt",
    unknown: "Nincs adat",
  };

  return (
    <div className="d-flex align-items-center gap-3 mb-4 p-3 rounded-4 bg-body-secondary border border-dark-subtle">

      {/* SZÍNES KÖR */}
      <div
        className={`rounded-circle ${colors[status]}`}
        style={{ width: 12, height: 12 }}
      />

      {/* EGY SOROS SZÖVEG */}
      <div className="d-flex align-items-center flex-wrap gap-3">

        <span className="fw-semibold">{labels[status]}</span>

        {lastRun && (
          <span className="text-muted small">
            • Utolsó futás: {new Date(lastRun).toLocaleString()}
          </span>
        )}

        {nextRun && (
          <span className="text-muted small">
            • Következő futás: {new Date(nextRun).toLocaleString()}
          </span>
        )}

      </div>
    </div>
  );
}
