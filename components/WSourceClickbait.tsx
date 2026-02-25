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
    <div
      className={`p-8 rounded-3xl shadow-2xl border backdrop-blur-xl
      ${isDark
          ? "bg-[#0b1220]/80 border-gray-700 text-gray-200"
          : "bg-white border-gray-200 text-gray-800"
        }`}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Clickbait Analytics
          </h2>
          <p className="text-sm opacity-60 mt-1">
            Forrásonkénti rangsor és aggregált statisztika
          </p>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        <StatCard label="Átlag Index" value={avg.toFixed(1)} />
        <StatCard label="Legmagasabb" value={highest?.score.toFixed(1)} />
        <StatCard label="Legalacsonyabb" value={lowest?.score.toFixed(1)} />
        <StatCard label="Források" value={sources.length} />
      </div>

      {/* CHART */}
      <div className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={sources}
            margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
          >
            <XAxis
              type="number"
              domain={[0, 70]}
              stroke={isDark ? "#888" : "#555"}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              stroke={isDark ? "#888" : "#555"}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              contentStyle={{
                backgroundColor: isDark ? "#111827" : "#fff",
                borderRadius: "12px",
                border: "none",
              }}
            />
            <Bar
              dataKey="score"
              radius={[0, 10, 10, 0]}
              animationDuration={800}
            >
              {sources.map((entry: any, index: number) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.score)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* STAT CARD */
function StatCard({ label, value }: any) {
  return (
    <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-5 rounded-2xl border border-indigo-500/20 backdrop-blur-md">
      <p className="text-sm opacity-60">{label}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}