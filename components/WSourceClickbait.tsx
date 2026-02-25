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

  // --- SUMMARY CHART DATA ---
  const summaryData = [
    { name: "Átlag Index", value: avg, color: "#818cf8" },
    { name: "Legmagasabb", value: highest.score, color: "#fb923c" },
    { name: "Legalacsonyabb", value: lowest.score, color: "#34d399" },
    { name: "Források", value: sources.length, color: "#38bdf8" },
  ];

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

      {/* ⭐ SUMMARY CHART – A 4 STAT EGYBEN ⭐ */}
      <div className="relative z-10 mb-14 p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-xl">
        <h3 className="text-lg font-semibold mb-4 text-white">
          Összesített mutatók
        </h3>

        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={summaryData}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <XAxis type="number" domain={[0, Math.max(highest.score, avg) + 10]} hide />
              <YAxis type="category" dataKey="name" width={140} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              />
              <Bar dataKey="value" radius={[0, 12, 12, 0]}>
                {summaryData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
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
