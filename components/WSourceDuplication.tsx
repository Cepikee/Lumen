"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";
import { useMemo, useState, useEffect } from "react";
import UtomModal from "@/components/UtomModal";
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
  const [openInfo, setOpenInfo] = useState(false);

  useEffect(() => {
    console.debug("WSourceDuplication mounted");
    return () => console.debug("WSourceDuplication unmounted");
  }, []);

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

  if (isLoading) return <div className="p-12 text-center">Betöltés...</div>;

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

  const palette = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#a855f7",
  ];

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      animations: { enabled: true },
      foreColor: isDark ? "#fff" : "#000",
      zoom: { enabled: false },
    },
    theme: { mode: isDark ? "dark" : "light" },
    plotOptions: {
      bar: {
        borderRadius: 6,
        horizontal: false,
        columnWidth: "45%",
        distributed: true,
      },
    },
    colors: palette,
    dataLabels: {
      enabled: true,
      formatter: (val) => `${(val as number).toFixed(1)}%`,
      style: { colors: [isDark ? "#fff" : "#000"], fontSize: "12px", fontWeight: 600 },
    },
    xaxis: {
      categories: items.map((i) => i.source),
      crosshairs: { show: false },
      labels: {
        rotate: -30,
        style: { colors: items.map(() => (isDark ? "#fff" : "#000")), fontWeight: 600 },
      },
    },
    yaxis: {
      crosshairs: { show: false },
      labels: { formatter: (val) => `${val}%` },
    },
    tooltip: {
      theme: isDark ? "dark" : "light",
      x: { show: false },
      marker: { show: false },
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
    grid: { borderColor: isDark ? "#334155" : "#e2e8f0" },
  };

  return (
    <>
      <div
        className={`relative z-10 p-12 rounded-3xl transition-all duration-500
          ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white/70 border-slate-200 text-slate-900"}
          shadow-[0_20px_60px_rgba(2,6,23,0.08)] border`}
      >
        <div className="flex items-center justify-center gap-4 mb-6">
          <h2 className="text-3xl font-semibold tracking-tight text-center">
            Másolási arány források szerint
          </h2>

          {/* Minimalista info button: csak az SVG, semmi kör, pontosan 26x26 */}
          <button
            onClick={() => {
              console.debug("INFO BUTTON CLICKED — openInfo before set:", openInfo);
              setOpenInfo(true);
            }}
            aria-label="Információ"
            type="button"
            className="w-[26px] h-[26px] p-0 m-0 flex items-center justify-center bg-transparent border-0"
            style={{ width: 26, height: 26 }}
          >
            <img
              src="/icons/info-svg.svg"
              alt="info"
              className="w-[26px] h-[26px] object-contain pointer-events-none"
              width={26}
              height={26}
              style={{ display: "block" }}
            />
          </button>
        </div>

        <div className="relative z-0 min-h-[340px]">
          <Chart options={options} series={series} type="bar" height={420} />
        </div>
      </div>

      <UtomModal show={openInfo} onClose={() => setOpenInfo(false)} title="Mi az a másolási arány?">
        <div className="text-sm leading-relaxed">
          <p className="mb-3">
            A rendszer azt méri, hogy egy adott hírforrás hányszor közöl olyan hírt, amelyet egy másik forrás már korábban publikált.
          </p>

          <p className="mb-2">
            <strong>Eredeti:</strong> hányszor volt ő az első.
          </p>

          <p className="mb-2">
            <strong>Átvett:</strong> hányszor jelent meg nála később ugyanaz a hír.
          </p>

          <p className="mt-3">
            A mutató: <strong>Átvett / (Eredeti + Átvett)</strong>.
          </p>
        </div>
      </UtomModal>
    </>
  );
}
