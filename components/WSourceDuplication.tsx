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

  // --- SZÍNES PALETTA (minden oszlop más szín) ---
  const palette = [
    "#ef4444", // piros
    "#f97316", // narancs
    "#eab308", // sárga
    "#22c55e", // zöld
    "#06b6d4", // türkiz
    "#3b82f6", // kék
    "#8b5cf6", // lila
    "#ec4899", // pink
    "#14b8a6", // teal
    "#a855f7", // violet
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
        distributed: true, // <-- EZ TESZI SZÍNESSÉ
      },
    },
    colors: palette,
    dataLabels: {
      enabled: true,
      formatter: (val) => `${(val as number).toFixed(1)}%`,
      style: {
        colors: [isDark ? "#fff" : "#000"],
        fontSize: "12px",
        fontWeight: 600,
      },
    },
    xaxis: {
      categories: items.map((i) => i.source),
      labels: {
        rotate: -30,
        style: {
          colors: items.map(() => (isDark ? "#fff" : "#000")),
          fontWeight: 600, // <-- FÉLKÖVÉR FORRÁSNEVEK
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
          const score = Number(val);
          return `Másolási arány: ${score.toFixed(1)}%
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
      <h2 className="text-3xl font-semibold tracking-tight text-center mb-10">
        Másolási arány (Duplication Score)
      </h2>

      <Chart options={options} series={series} type="bar" height={420} />
    </div>
  );
}
