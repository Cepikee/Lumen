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

  // --- Kategória színek ---
  const categoryColors = [
    "#ef4444", // Politika
    "#f59e0b", // Gazdaság
    "#10b981", // Közélet
    "#3b82f6", // Kultúra
    "#8b5cf6", // Sport
    "#ec4899", // Tech
    "#14b8a6", // Egészségügy
    "#6366f1", // Oktatás
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

      {/* --- VÍZSZINTES SCROLL, KÖZÉPRE IGAZÍTVA --- */}
      <div className="flex gap-6 overflow-x-auto pb-4 justify-center">
        {items.map((src) => {
          const series = [
            {
              name: src.source,
              data: categories.map((c) => (src as any)[c] ?? 0),
            },
          ];

          const options: ApexOptions = {
            chart: {
              type: "bar",
              toolbar: { show: false },
              background: "transparent",
            },
            plotOptions: {
              bar: {
                horizontal: true,
                barHeight: "55%",
              },
            },
            dataLabels: {
              enabled: true,
              style: {
                colors: [isDark ? "#fff" : "#000"],
                fontSize: "11px",
              },
            },
            xaxis: {
              categories,
              labels: {
                style: {
                  colors: isDark ? "#fff" : "#000",
                  fontSize: "11px",
                },
              },
            },
            yaxis: {
              labels: {
                style: {
                  colors: isDark ? "#fff" : "#000",
                  fontSize: "11px",
                },
              },
            },
            legend: { show: false },
            colors: categoryColors,
          };

          return (
            <div
              key={src.source}
              className="min-w-[280px] p-3 rounded border"
              style={{
                background: isDark ? "#0b1220" : "#fff",
                borderColor: isDark ? "#1e293b" : "#e5e7eb",
                color: isDark ? "#fff" : "#000",
              }}
            >
              <h4 className="text-md font-semibold mb-2 text-center">
                {src.source}
              </h4>

              <ApexChart
                options={options}
                series={series}
                type="bar"
                height={260}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
