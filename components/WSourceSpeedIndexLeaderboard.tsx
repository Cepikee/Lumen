"use client";

import useSWR from "swr";
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

  if (isLoading) {
    return <div className="p-4 text-center">Betöltés…</div>;
  }

  if (error || !data?.success) {
    return (
      <div className="p-4 text-red-500">
        Nem sikerült betölteni a Speed Index adatokat.
      </div>
    );
  }

  const items = data.leaderboard;

  // Színskála késés alapján
  const getColor = (delay: number) => {
    if (delay <= 1) return "#22c55e"; // zöld
    if (delay <= 5) return "#eab308"; // sárga
    return "#ef4444"; // piros
  };

  return (
    <div
      className={`p-6 rounded-xl shadow-lg border ${
        isDark
          ? "border-[#1e293b] bg-[#0f172a] text-white"
          : "border-gray-200 bg-white text-black"
      }`}
    >
      <h3 className="text-xl font-bold mb-6 text-center">
        ⚡ Speed Index — Átlagos késés forrásonként
      </h3>

      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={items}
            margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
          >
            <XAxis
              dataKey="source"
              stroke={isDark ? "#cbd5e1" : "#475569"}
              tick={{ fontSize: 14 }}
            />
            <YAxis
              stroke={isDark ? "#cbd5e1" : "#475569"}
              tick={{ fontSize: 14 }}
              label={{
                value: "perc",
                angle: -90,
                position: "insideLeft",
                fill: isDark ? "#cbd5e1" : "#475569",
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                border: "1px solid #475569",
                borderRadius: "8px",
                color: isDark ? "#ffffff" : "#000000",
              }}
            />
            <Bar dataKey="avgDelay" radius={[6, 6, 0, 0]}>
              {items.map((item, index) => (
                <Cell key={index} fill={getColor(item.avgDelay)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
