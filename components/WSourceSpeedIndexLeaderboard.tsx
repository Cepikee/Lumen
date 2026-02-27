"use client";

import useSWR from "swr";
import { useMemo } from "react";
import { useUserStore } from "@/store/useUserStore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { motion } from "framer-motion";

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

interface LeaderboardItem {
  source: string;
  avgDelay: number;
  medianDelay: number;
  updatedAt: string;
}

export default function WSourceSpeedIndexLeaderboard() {
  const theme = useUserStore((s) => s.theme);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR<{
    success: boolean;
    leaderboard: LeaderboardItem[];
  }>("/api/insights/speedindex/leaderboard", fetcher, {
    refreshInterval: 60000,
  });

  const sortedItems = useMemo(() => {
    if (!data?.leaderboard) return [];
    return [...data.leaderboard].sort((a, b) => a.avgDelay - b.avgDelay);
  }, [data]);

  if (isLoading) {
    return (
      <div className="p-6 text-center animate-pulse opacity-70">
        Speed Index betöltése...
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="p-6 text-red-500 text-center">
        Nem sikerült betölteni az adatokat.
      </div>
    );
  }

  const getBarColor = (delay: number) => {
    if (delay <= 1)
      return isDark ? "url(#greenGradientDark)" : "url(#greenGradient)";
    if (delay <= 5)
      return isDark ? "url(#yellowGradientDark)" : "url(#yellowGradient)";
    return isDark ? "url(#redGradientDark)" : "url(#redGradient)";
  };

  return (
    <div
      className={`relative p-8 rounded-2xl border backdrop-blur-xl transition-all duration-300
      ${
        isDark
          ? "bg-gradient-to-br from-[#0f172a] to-[#111827] border-slate-800 text-white"
          : "bg-gradient-to-br from-white to-slate-50 border-slate-200 text-slate-900"
      } shadow-2xl`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-bold tracking-tight">
          ⚡ Speed Index Leaderboard
        </h3>
        <span className="text-sm opacity-60">
          Automatikus frissítés · 60 mp
        </span>
      </div>

      {/* Top 3 Highlight */}
      <div className="grid md:grid-cols-3 gap-4 mb-10">
        {sortedItems.slice(0, 3).map((item, i) => (
          <motion.div
            key={item.source}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-5 rounded-xl border relative overflow-hidden
            ${
              i === 0
                ? "border-emerald-500 shadow-lg shadow-emerald-500/20"
                : "border-slate-700"
            }`}
          >
            <div className="text-sm opacity-60 mb-1">
              #{i + 1} Leggyorsabb
            </div>
            <div className="text-lg font-semibold">{item.source}</div>
            <div className="mt-2 text-3xl font-bold">
              {item.avgDelay.toFixed(2)} perc
            </div>
            <div className="text-sm opacity-60">
              Medián: {item.medianDelay.toFixed(2)} perc
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <div className="w-full h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sortedItems}>
            <defs>
              <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="yellowGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#ca8a04" />
              </linearGradient>
              <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="100%" stopColor="#b91c1c" />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="source"
              stroke={isDark ? "#94a3b8" : "#64748b"}
              tick={{ fontSize: 13 }}
            />
            <YAxis
              stroke={isDark ? "#94a3b8" : "#64748b"}
              tick={{ fontSize: 13 }}
              label={{
                value: "Késés (perc)",
                angle: -90,
                position: "insideLeft",
                fill: isDark ? "#94a3b8" : "#64748b",
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                borderRadius: "12px",
                border: "1px solid #334155",
              }}
              formatter={(value: any) => `${value} perc`}
            />
            <Bar
              dataKey="avgDelay"
              radius={[8, 8, 0, 0]}
              animationDuration={1200}
            >
              {sortedItems.map((item, index) => (
                <Cell
                  key={index}
                  fill={getBarColor(item.avgDelay)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}