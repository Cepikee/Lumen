"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";
import Spinner from "react-bootstrap/Spinner";
import { useUserStore } from "@/store/useUserStore";
import type { ApexOptions } from "apexcharts";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

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
    { refreshInterval: 60_000, revalidateOnFocus: true }
  );

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (error || !data || !data.success || !Array.isArray(data.items)) {
    return (
      <div className="p-4 text-red-500">
        Nem sikerült betölteni a kategóriaeloszlást.
      </div>
    );
  }

  const items = data.items;

  if (!items.length) {
    return (
      <div className="p-4 text-gray-500">
        Nincs elég adat a kategóriaeloszláshoz.
      </div>
    );
  }

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

      {/* --- SZÍNMAGYARÁZAT --- */}
      <div className="flex flex-wrap gap-3 mb-6 justify-center text-sm">
        {categories.map((cat, i) => (
          <div key={cat} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: categoryColors[i] }}
            />
            <span>{cat}</span>
          </div>
        ))}
      </div>

      {/* --- DONUTOK EGY SORBAN, KISEBB MÉRETBEN --- */}
      <div className="flex gap-6 overflow-x-auto pb-4 justify-center">
        {items.map((src) => {
          const values = categories.map((c) => (src as any)[c] ?? 0);

          const options: ApexOptions = {
            chart: {
              type: "donut",
              toolbar: { show: false },
            },
            labels: categories,
            colors: categoryColors,
            legend: { show: false },
            dataLabels: {
              enabled: true,
              formatter: (_val, opts) => {
                const raw = values[opts.seriesIndex];
                return raw > 0 ? raw.toString() : "";
              },
              style: {
                colors: [isDark ? "#fff" : "#000"],
                fontSize: "10px",
              },
            },
            plotOptions: {
              pie: {
                donut: {
                  size: "60%",
                },
              },
            },
          };

          return (
            <div
              key={src.source}
              className="min-w-[180px] p-2 rounded border flex flex-col items-center"
              style={{
                background: isDark ? "#0b1220" : "#fff",
                borderColor: isDark ? "#1e293b" : "#e5e7eb",
                color: isDark ? "#fff" : "#000",
              }}
            >
              <h4 className="text-sm font-semibold mb-1 text-center">
                {src.source}
              </h4>

              <ApexChart
                options={options}
                series={values}
                type="donut"
                height={150}
                width={150}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
