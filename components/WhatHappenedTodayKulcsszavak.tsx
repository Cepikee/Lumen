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
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (error || !data || !data.success || !Array.isArray(data.keywords) || data.keywords.length === 0) {
    return <div className="text-muted">Ma még nincsenek felkapott kulcsszavak.</div>;
  }

  // rendezés: legnagyobb elöl
  const sorted = [...data.keywords].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));

  // Apex series: egy sor, minden keyword külön sorként jelenik meg a horizontal bar chartban
  const series = [
    {
      name: "Említések",
      data: sorted.map((k) => Number(k.count ?? 0)),
    },
  ];

  // Kategóriák — ApexCharts-ban a categories az xaxis alatt van (még horizontal true esetén is)
  const categories = sorted.map((k) => String(k.keyword));

  const colors = [
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

  const options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      // animations: csak a típusnak megfelelő mezőket használjuk
      animations: {
        enabled: true,
        speed: 600,
        animateGradually: { enabled: true, delay: 80 },
        dynamicAnimation: { enabled: true, speed: 300 },
      },
      background: "transparent",
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 6,
        barHeight: "56%",
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: any) => `${val} db`,
      style: {
        fontSize: "13px",
        fontWeight: 700,
        colors: isDark ? ["#fff"] : ["#000"],
      },
      offsetX: 8,
    },
    // Kategóriákat az xaxis.categories-ben adjuk meg
    xaxis: {
      categories,
      labels: {
        show: false, // ha nem akarod az x tengely feliratot
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    // yaxis csak a label stílusát tartalmazza
    yaxis: {
      labels: {
        show: true,
        style: {
          colors: isDark ? Array(categories.length).fill("#fff") : Array(categories.length).fill("#111827"),
          fontSize: "13px",
          fontWeight: 600,
        },
      },
    },
    colors,
    tooltip: {
      theme: isDark ? "dark" : "light",
      y: {
        formatter: (val: any) => `${val} db`,
      },
    },
    grid: { show: false },
    legend: { show: false },
  };

  const stableKey = `${theme}-${sorted.length}-${sorted.map((s) => s.count).join(",")}`;

  // magasság dinamikusan a sorok számához igazítva
  const height = Math.max(120, sorted.length * 48);

  return (
    <div className="wht-keywords-activity">
      <h5 className="mb-3 text-center">Felkapott kulcsszavak ma</h5>

      <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
        <ApexChart key={stableKey} options={options} series={series} type="bar" height={height} />
      </div>
    </div>
  );
}
