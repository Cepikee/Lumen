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
    const interval = setInterval(load, 10000); // 10 másodpercenként frissít
    return () => clearInterval(interval);
  }, []);

  if (!data) return null;

  const { status, lastRun, nextRun } = data;

  const colors: Record<string, string> = {
    running: "bg-green-500",
    waiting: "bg-yellow-500",
    error: "bg-red-500",
    unknown: "bg-gray-500",
  };

  const labels: Record<string, string> = {
    running: "AI éppen dolgozik",
    waiting: "Várakozik a következő futásra",
    error: "Hiba történt",
    unknown: "Nincs adat",
  };

  return (
    <div className="flex items-center gap-3 mb-4 p-2 rounded-md bg-[#1a1a1a] border border-[#333]">
      <div className={`w-3 h-3 rounded-full ${colors[status]}`} />

      <div className="flex flex-col">
        <span className="font-medium text-gray-200">{labels[status]}</span>

        {lastRun && (
          <span className="text-xs text-gray-400">
            Utolsó futás: {new Date(lastRun).toLocaleString()}
          </span>
        )}

        {nextRun && (
          <span className="text-xs text-gray-400">
            Következő futás: {new Date(nextRun).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
