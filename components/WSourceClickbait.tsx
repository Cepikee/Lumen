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

  const sources = data.sources || [];

  // Recharts data format
  const chartData = sources.map((src: any) => ({
    name: src.source,
    score: Number(src.avg_clickbait),
  }));

  const getColor = (score: number) =>
    score >= 60 ? "#ef4444" : // red
    score >= 40 ? "#f59e0b" : // yellow
    "#3b82f6"; // blue

  const getIcon = (score: number) =>
    score >= 60 ? "🔥" :
    score >= 40 ? "⚠️" :
    "🧊";

  return (
    <div
      className={`p-6 rounded-2xl border shadow-lg ${
        isDark
          ? "bg-[#0f172a] border-gray-700 text-gray-200"
          : "bg-white border-gray-200 text-gray-800"
      }`}
    >
      <h2 className="text-2xl font-bold mb-6">Clickbait index forrásonként</h2>

      <div className="w-full h-[450px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              stroke={isDark ? "#94a3b8" : "#475569"}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tickFormatter={(name: string) => {
                const score = chartData.find((x: { name: string; score: number }) => x.name === name)?.score || 0;
                return `${getIcon(score)}  ${name}`;
              }}
              stroke={isDark ? "#94a3b8" : "#475569"}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#1e293b" : "#fff",
                borderRadius: "8px",
                border: "1px solid #334155",
              }}
            />
            <Bar dataKey="score" radius={[6, 6, 6, 6]}>
              {chartData.map((entry: { name: string; score: number }, index: number) => (
                <Cell key={index} fill={getColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
