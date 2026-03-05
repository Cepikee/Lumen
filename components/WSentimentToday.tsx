"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";
import { useUserStore } from "@/store/useUserStore";
import { useState } from "react";
import UtomModal from "@/components/UtomModal";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const fetcher = (url: string) =>
  fetch(url, {
    headers: { "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY! },
  }).then((r) => r.json());

export default function WSentimentToday() {
  const theme = useUserStore((s) => s.theme);
  const [openInfo, setOpenInfo] = useState(false);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR(
    "/api/insights/sentiment/today",
    fetcher,
    { refreshInterval: 60000 }
  );

  if (isLoading) return <div className="p-12 text-center">Betöltés...</div>;
  if (error || !data?.success)
    return (
      <div className="p-12 text-center text-red-500">
        Hiba az adatok betöltésekor
      </div>
    );

  const series = [
    data.positive || 0,
    data.neutral || 0,
    data.negative || 0,
  ];

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "pie",
      background: "transparent", // 🔥 nincs apex háttér
      foreColor: isDark ? "#fff" : "#000",
      toolbar: { show: false },
      animations: { enabled: true },
      zoom: { enabled: false },
    },

    theme: { mode: isDark ? "dark" : "light" },

    plotOptions: {
      pie: {
        expandOnClick: false, // 🔥 ne nagyítson hoverkor
        donut: { labels: { show: false } },
      },
    },

    states: {
      hover: { filter: { type: "none" } }, // 🔥 nincs hover highlight
      active: { filter: { type: "none" } },
    },

    grid: {
      borderColor: isDark ? "#334155" : "#e2e8f0",
      strokeDashArray: 3, // 🔥 nincs világos csík hoverkor
    },

    tooltip: {
      theme: isDark ? "dark" : "light",
      fillSeriesColor: false,
      marker: { show: false },
    },

    legend: {
      position: "bottom",
      labels: { colors: isDark ? "#fff" : "#000" },
      onItemHover: { highlightDataSeries: false }, // 🔥 nincs legend hover highlight
    },

    labels: ["Pozitív", "Semleges", "Negatív"],
    colors: ["#22c55e", "#94a3b8", "#ef4444"],

    dataLabels: {
      enabled: true,
      formatter: (val) => {
        const num = Number(val);
        return isNaN(num) ? "0%" : `${num.toFixed(1)}%`;
      },
    },
  };

  return (
    <>
      <div
        className="relative z-10 p-12 rounded-3xl wsource-card--ghost"
        style={{ background: "var(--bs-body-bg)" }} // 🔥 egységes UTOM háttér
      >
        <div className="flex items-center justify-center gap-4 mb-6">
          <h2 className="text-3xl font-semibold tracking-tight text-center">
            Napi hangulatmegoszlás
          </h2>

          <button
            onClick={() => setOpenInfo(true)}
            className="w-[26px] h-[26px] flex items-center justify-center bg-transparent border-0"
          >
            <img src="/icons/info-svg.svg" alt="info" width={26} height={26} />
          </button>
        </div>

        <div className="min-h-[340px]">
          <Chart options={options} series={series} type="pie" height={380} />
        </div>
      </div>

      <UtomModal
        show={openInfo}
        onClose={() => setOpenInfo(false)}
        title="Mi az a hangulatelemzés?"
      >
        <div className="text-sm leading-relaxed">
          <p>
            A rendszer minden cikket pozitív, semleges vagy negatív hangulatúnak
            osztályoz.
          </p>
          <p className="mt-2">
            Ez a grafikon azt mutatja, hogy a mai hírek milyen arányban
            tartoznak ezekbe a kategóriákba.
          </p>
        </div>
      </UtomModal>
    </>
  );
}
