"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";
import { useMemo } from "react";
import { useUserStore } from "@/store/useUserStore";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface DuplicationItem {
  source: string;
  original: number;
  duplicate: number;
  duplicationScore: number;
}

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

export default function WSourceDuplication() {
  const theme = useUserStore((s) => s.theme);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR<{
    success: boolean;
    duplication: DuplicationItem[];
  }>("/api/insights/duplication", fetcher, {
    refreshInterval: 60000,
  });

  const items = useMemo(() => {
    if (!data?.duplication) return [];
    return [...data.duplication].sort(
      (a, b) => b.duplicationScore - a.duplicationScore
    );
  }, [data]);

  if (isLoading)
    return <div className="p-12 text-center">Betöltés...</div>;

  if (error || !data?.success)
    return (
      <div className="p-12 text-center text-red-500">
        Hiba az adatok betöltésekor
      </div>
    );

  const series = [
    {
      name: "Másolási arány (%)",
      data: items.map((i) => i.duplicationScore),
    },
  ];

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      animations: { enabled: true },
      foreColor: isDark ? "#fff" : "#000",
    },
    theme: {
      mode: isDark ? "dark" : "light",
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        horizontal: false,
        columnWidth: "45%",
      },
    },
    colors: ["#ef4444"],
    dataLabels: {
      enabled: true,
      formatter: (val) => `${(val as number).toFixed(1)}%`,
      style: {
        colors: [isDark ? "#fff" : "#000"],
        fontSize: "12px",
      },
    },
    xaxis: {
      categories: items.map((i) => i.source),
      labels: {
        rotate: -30,
        style: {
          colors: items.map(() => (isDark ? "#fff" : "#000")),
        },
      },
    },
    yaxis: {
      labels: {
        formatter: (val) => `${val}%`,
      },
    },
    tooltip: {
      theme: isDark ? "dark" : "light",
      y: {
        formatter: (val, opts) => {
          const item = items[opts.dataPointIndex];
          return `Másolási arány: ${val.toFixed(1)}%
Eredeti: ${item.original}
Átvett: ${item.duplicate}`;
        },
      },
    },
    grid: {
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
  };

  return (
    <div
      className={`p-12 rounded-3xl backdrop-blur-2xl border transition-all duration-500
      ${
        isDark
          ? "bg-white/5 border-white/10 text-white"
          : "bg-white/70 border-slate-200 text-slate-900"
      }
      shadow-[0_40px_100px_rgba(0,0,0,0.25)]`}
    >
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-3xl font-semibold tracking-tight">
          🔁 Másolási arány (Duplication Score)
        </h2>
        <div className="text-sm opacity-60">
          Live ranking · 60 mp refresh
        </div>
      </div>

      <Chart options={options} series={series} type="bar" height={420} />
    </div>
  );
}
