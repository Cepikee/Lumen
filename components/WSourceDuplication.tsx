"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";
import { useMemo, useState } from "react";
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
    theme: {
      mode: isDark ? "dark" : "light",
    },
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
      style: {
        colors: [isDark ? "#fff" : "#000"],
        fontSize: "12px",
        fontWeight: 600,
      },
    },
    xaxis: {
      categories: items.map((i) => i.source),
      crosshairs: { show: false },
      labels: {
        rotate: -30,
        style: {
          colors: items.map(() => (isDark ? "#fff" : "#000")),
          fontWeight: 600,
        },
      },
    },
    yaxis: {
      crosshairs: { show: false },
      labels: {
        formatter: (val) => `${val}%`,
      },
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
    grid: {
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
  };

  return (
    <>
      <div
        className={`relative z-0 p-12 rounded-3xl backdrop-blur-2xl border transition-all duration-500 pointer-events-none
        ${
          isDark
            ? "bg-white/5 border-white/10 text-white"
            : "bg-white/70 border-slate-200 text-slate-900"
        }
        shadow-[0_40px_100px_rgba(0,0,0,0.25)]`}
      >
        <h2 className="text-3xl font-semibold tracking-tight text-center mb-10 flex items-center justify-center gap-2 pointer-events-auto">
          Másolási arány források szerint

          <button
            onClick={() => setOpenInfo(true)}
            className="w-[26px] h-[26px] mt-1 opacity-70 hover:opacity-100 transition flex items-center justify-center"
          >
            <img
              src="/icons/info-svg.svg"
              alt="info"
              className="w-[26px] h-[26px] object-contain"
            />
          </button>
        </h2>

        <div className="pointer-events-auto">
          <Chart
            options={options}
            series={series}
            type="bar"
            height={420}
          />
        </div>
      </div>

      {openInfo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div
            className={`p-8 rounded-2xl max-w-lg text-center ${
              isDark ? "bg-slate-800 text-white" : "bg-white text-slate-900"
            }`}
          >
            <h3 className="text-xl font-semibold mb-4">
              Mi az a másolási arány?
            </h3>

            <p className="text-sm leading-relaxed mb-6">
              A rendszer azt méri, hogy egy adott hírforrás hányszor közöl olyan hírt,
              amelyet egy másik forrás már korábban publikált.
              <br /><br />
              <strong>Eredeti:</strong> hányszor volt ő az első.
              <br />
              <strong>Átvett:</strong> hányszor jelent meg nála később ugyanaz a hír.
              <br /><br />
              A mutató: <strong>Átvett / (Eredeti + Átvett)</strong>.
            </p>

            <button
              onClick={() => setOpenInfo(false)}
              className="px-6 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Bezárás
            </button>
          </div>
        </div>
      )}
    </>
  );
}
