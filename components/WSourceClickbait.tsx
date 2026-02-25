"use client";

import useSWR from "swr";
import { useUserStore } from "@/store/useUserStore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

export default function WSourceClickbaitPro() {
  const theme = useUserStore((s) => s.theme);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR(
    "/api/insights/clickbait",
    fetcher,
    { refreshInterval: 60000 }
  );

  if (isLoading) return <div>Betöltés…</div>;
  if (error || !data?.success) return <div>Hiba történt.</div>;

  const sources = (data.sources || [])
    .map((s: any) => ({
      name: s.source,
      score: Number(s.avg_clickbait),
    }))
    .sort((a: any, b: any) => b.score - a.score);

  const avg =
    sources.reduce((acc: number, s: any) => acc + s.score, 0) /
    sources.length;

  const highest = sources[0];
  const lowest = sources[sources.length - 1];

  const getBarColor = (score: number) => {
    if (score >= 60) return "#ef4444";
    if (score >= 45) return "#f97316";
    if (score >= 35) return "#eab308";
    return "#22c55e";
  };

  return (
    <div className="relative p-10 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)] overflow-hidden">

      {/* subtle background glow */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />

      {/* HEADER */}
      <div className="relative z-10 mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-white text-center">
          Forrásonkénti rangsor és aggregált statisztika
        </h2>
      </div>

      {/* ⭐ STAT CHART BLOCK ⭐ */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">

        <StatChartCard
          label="Átlag Index"
          value={avg.toFixed(1)}
          color="#818cf8"
          data={[{ v: avg }]}
        />

        <StatChartCard
          label="Legmagasabb"
          value={highest.score.toFixed(1)}
          color="#fb923c"
          data={[{ v: highest.score }]}
        />

        <StatChartCard
          label="Legalacsonyabb"
          value={lowest.score.toFixed(1)}
          color="#34d399"
          data={[{ v: lowest.score }]}
        />

        <StatChartCard
          label="Források"
          value={sources.length}
          color="#38bdf8"
          data={[{ v: sources.length }]}
          max={10}
        />

      </div>

      {/* ⭐ ÚJ: SZÖVEGES STAT ÖSSZEFOGLALÓ ⭐ */}
      <div className="relative z-10 mb-10 text-center text-gray-300 text-sm">
        <p>Átlag: <span className="text-indigo-400 font-semibold">{avg.toFixed(1)}</span></p>
        <p>Legmagasabb: <span className="text-orange-400 font-semibold">{highest.score.toFixed(1)}</span></p>
        <p>Legalacsonyabb: <span className="text-emerald-400 font-semibold">{lowest.score.toFixed(1)}</span></p>
      </div>

      {/* MAIN CHART */}
      <div className="relative z-10 h-[440px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={sources}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <XAxis type="number" domain={[0, 70]} stroke="#475569" />
            <YAxis type="category" dataKey="name" width={130} stroke="#64748b" />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "16px",
              }}
              labelStyle={{ color: "#94a3b8" }}
            />
            <Bar dataKey="score" radius={[0, 14, 14, 0]} animationDuration={900}>
              {sources.map((entry: any, index: number) => (
                <Cell
                  key={index}
                  fill={getBarColor(entry.score)}
                  stroke={index < 3 ? "rgba(255,255,255,0.4)" : "none"}
                  strokeWidth={index < 3 ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ⭐ MINI STAT CHART COMPONENT ⭐ */
function StatChartCard({
  label,
  value,
  color,
  data,
  max = 70,
}: {
  label: string;
  value: string | number;
  color: string;
  data: any[];
  max?: number;
}) {
  return (
    <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-xl">
      <p className="text-xs uppercase tracking-wider text-gray-300 mb-3">{label}</p>

      <div className="w-full h-28">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
            <XAxis type="number" hide domain={[0, max]} />
            <Bar dataKey="v" fill={color} radius={[10, 10, 10, 10]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-3xl font-bold mt-2" style={{ color }}>{value}</p>
    </div>
  );
}
