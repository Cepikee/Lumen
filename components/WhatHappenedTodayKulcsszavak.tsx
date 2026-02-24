"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";
import Spinner from "react-bootstrap/Spinner";
import { useUserStore } from "@/store/useUserStore";
import type { ApexOptions } from "apexcharts";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface KeywordItem {
  keyword: string;
  count: number;
  level: "mild" | "strong" | "brutal" | null;
}

interface ApiResponse {
  success: boolean;
  keywords: KeywordItem[];
}

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

export default function TrendingKeywords() {
  const theme = useUserStore((s) => s.theme);
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR<ApiResponse>(
    "/api/insights/trending-keywords",
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
    }
  );

  if (isLoading) {
    return (
      <div className="text-center py-2 text-gray-500">
        <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
        <span className="ml-2 text-sm">Betöltés...</span>
      </div>
    );
  }

  if (error || !data || !data.success || !Array.isArray(data.keywords) || data.keywords.length === 0) {
    return <div className="text-sm text-gray-500">Ma még nincsenek felkapott kulcsszavak.</div>;
  }

  // rendezés: legnagyobb elöl
  const sorted = [...data.keywords].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  const counts = sorted.map((k) => Number(k.count ?? 0));
  const categories = sorted.map((k) => String(k.keyword));
  const max = Math.max(...counts, 1);

  // Színek soronként (distributed)
  const baseColors = [
    "#FF4D4F",
    "#FFA940",
    "#36CFC9",
    "#40A9FF",
    "#9254DE",
    "#73D13D",
    "#F759AB",
    "#597EF7",
    "#FFC53D",
    "#5CDBD3",
  ];
  const colors = sorted.map((_, i) => baseColors[i % baseColors.length]);

  const options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      animations: {
        enabled: true,
        speed: 600,
        animateGradually: { enabled: true, delay: 60 },
        dynamicAnimation: { enabled: true, speed: 300 },
      },
      background: "transparent",
      offsetY: -6, // csökkenti a cím alatti üres teret
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 6,
        barHeight: "48%",
        distributed: true, // minden sáv más színű
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: any) => `${val} db`,
      style: {
        fontSize: "12px",
        fontWeight: 700,
        colors: isDark ? ["#fff"] : ["#000"],
      },
      offsetX: 6,
    },
    xaxis: {
      categories,
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { show: false }, // kulcsszavakat mi rendereljük bal oldalon
    },
    colors,
    tooltip: {
      theme: isDark ? "dark" : "light",
      y: { formatter: (val: any) => `${val} db` },
    },
    grid: { show: false },
    legend: { show: false },
  };

  const stableKey = `${theme}-${sorted.length}-${counts.join(",")}`;
  const height = Math.max(100, sorted.length * 40); // kompaktabb magasság

  return (
    <div className="bg-white/80 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-3 max-w-full">
      <h5 className="text-sm font-medium mb-2 text-center text-gray-900 dark:text-gray-100">
        Felkapott kulcsszavak ma
      </h5>

      <div className="flex items-start gap-3">
        {/* Bal: kulcsszó + kis margó (egy sorban a sávval) */}
        <div className="flex-shrink-0 w-36 pl-1">
          <div className="flex flex-col gap-3">
            {sorted.map((item, i) => (
              <div key={i} className="flex items-center h-8">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                  {item.keyword}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Jobb: chart (sávok) */}
        <div className="flex-1 min-w-0">
          <ApexChart
            key={stableKey}
            options={options}
            series={[{ name: "Említések", data: counts }]}
            type="bar"
            height={height}
          />
        </div>
      </div>
    </div>
  );
}
