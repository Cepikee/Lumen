"use client";

import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import useSWR from "swr";
import Spinner from "react-bootstrap/Spinner";
import { useUserStore } from "@/store/useUserStore";

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

interface CategoryItem {
  source: string;
  Politika: number;
  Gazdaság: number;
  Közélet: number;
  Kultúra: number;
  Sport: number;
  Tech: number;
  Egészségügy: number;
  Oktatás: number;
}

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

export default function WSourceCategoryDistribution() {
  const theme = useUserStore((s) => s.theme);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR<{ success: boolean; items: CategoryItem[] }>(
    "/api/insights/source-category-distribution",
    fetcher,
    { refreshInterval: 60000 }
  );

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (error || !data?.success) {
    return <div className="p-4 text-red-500">Nem sikerült betölteni az adatokat.</div>;
  }

  const items = data.items;

  const categories = [
    "Politika",
    "Gazdaság",
    "Közélet",
    "Kultúra",
    "Sport",
    "Tech",
    "Egészségügy",
    "Oktatás",
  ];

  const categoryColors = [
    "#ef4444",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#6366f1",
  ];

  return (
    <div
      className="p-4 rounded border"
      style={{
        background: isDark ? "#0b1220" : "#fff",
        borderColor: isDark ? "#1e293b" : "#e5e7eb",
        color: isDark ? "#fff" : "#000",
      }}
    >
      <h3 className="text-lg font-semibold mb-4">Kategóriaeloszlás forrásonként</h3>

      {/* --- SZÉP, KIS LEGEND --- */}
      <div className="flex flex-wrap gap-4 mb-6 justify-center text-xs opacity-80">
        {categories.map((cat, i) => (
          <div key={cat} className="flex items-center gap-1">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: categoryColors[i] }}
            />
            <span>{cat}</span>
          </div>
        ))}
      </div>

      {/* --- DOUGHNUT CHARTOK --- */}
      <div className="flex gap-6 overflow-x-auto pb-4 justify-center pl-4">
        {items.map((src) => {
          const values = categories.map((c) => (src as any)[c] ?? 0);

          const chartData = {
            labels: categories,
            datasets: [
              {
                data: values,
                backgroundColor: categoryColors,
                borderWidth: 0,
              },
            ],
          };

          const options = {
            cutout: "70%",
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx: any) => {
                    const value = ctx.raw;
                    return value > 0 ? `${ctx.label}: ${value}` : "";
                  },
                },
              },
              datalabels: {
                color: isDark ? "#fff" : "#000",
                font: {
                  size: 9,
                  weight: "bold" as const,
                },
                formatter: (value: number) => {
                  return value > 0 ? value : "";
                },
              },
            },
          };

          return (
            <div
              key={src.source}
              className="min-w-[150px] p-2 rounded border flex flex-col items-center"
              style={{
                background: isDark ? "#0b1220" : "#fff",
                borderColor: isDark ? "#1e293b" : "#e5e7eb",
                color: isDark ? "#fff" : "#000",
              }}
            >
              <h4 className="text-xs font-semibold mb-1 text-center">
                {src.source}
              </h4>

              <div className="relative w-[120px] h-[120px]">
                <Doughnut data={chartData} options={options} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
