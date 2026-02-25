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
  LabelList,
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
  className="relative p-10 rounded-3xl shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)] overflow-hidden"
  style={{
    background: isDark
      ? "linear-gradient(to bottom right, #0f172a, #020617)"
      : "#ffffff"
  }}
>


      {/* subtle background glow */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />

      {/* HEADER */}
      <div className="relative z-10 mb-12 mt-6">
        <h2
          className="text-3xl font-bold tracking-tight text-center"
          style={{ color: isDark ? "#fff" : "#000" }}
        >
          Források Clickbait Indexei
        </h2>
      </div>

      {/* MAIN CHART */}
      <div className="relative z-10 h-[440px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            key={isDark ? "dark" : "light"} // force rerender on theme change
            layout="vertical"
            data={sources}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <XAxis
              type="number"
              domain={[0, 70]}
              stroke={isDark ? "#cbd5e1" : "#475569"}
              tick={{ fill: isDark ? "#e2e8f0" : "#334155" }}
            />

            <YAxis
              type="category"
              dataKey="name"
              width={130}
              stroke={isDark ? "#e2e8f0" : "#334155"}
              tick={{ fill: isDark ? "#e2e8f0" : "#334155" }}
            />

            <Tooltip
              cursor={{
                fill: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.05)",
              }}
              contentStyle={{
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                border: isDark ? "1px solid #334155" : "1px solid #e5e7eb",
                borderRadius: "12px",
                color: isDark ? "#f1f5f9" : "#0f172a",
              }}
              labelStyle={{
                color: isDark ? "#f8fafc" : "#0f172a",
                fontWeight: 600,
              }}
              itemStyle={{
                color: isDark ? "#f1f5f9" : "#0f172a",
                fontWeight: 500,
              }}
              formatter={(value?: number) => (value ?? 0).toFixed(2)}

            />

             <Bar dataKey="score" radius={[0, 14, 14, 0]} animationDuration={900}>
                <LabelList
                    dataKey="score"
                    position="right"
                    fill={isDark ? "#ffffff" : "#000000"}
                    formatter={(value: any) => {
                        const num = Number(value);  
                        return isNaN(num) ? "" : num.toFixed(1);
                    }}
                    style={{ fontSize: "14px", fontWeight: 600 }}
                />
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

      {/* ⭐ SZÖVEGES STAT ÖSSZEFOGLALÓ ⭐ */}
      <div className="relative z-10 mt-10 mb-6 text-sm flex items-center justify-center gap-32 px-4">
        <p className="text-gray-300">
          Átlag:{" "}
          <span className="text-indigo-400 font-semibold">
            {avg.toFixed(1)}
          </span>
        </p>

        <p className="text-gray-300">
          Legmagasabb:{" "}
          <span className="text-orange-400 font-semibold">
            {highest.score.toFixed(1)}
          </span>
        </p>

        <p className="text-gray-300">
          Legalacsonyabb:{" "}
          <span className="text-emerald-400 font-semibold">
            {lowest.score.toFixed(1)}
          </span>
        </p>
      </div>
    </div>
  );
}
