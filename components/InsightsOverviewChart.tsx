"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useUserStore } from "@/store/useUserStore";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const CATEGORY_COLORS: Record<string, string> = {
  Sport: "#ef4444",
  Politika: "#3b82f6",
  Gazdaság: "#00ff5e",
  Tech: "#f97316",
  Kultúra: "#eab308",
  Oktatás: "#a855f7",
  Egészségügy: "#e600ee",
  Közélet: "#578f68",
  _default: "#6b7280",
};

function getCategoryColor(c: string) {
  return CATEGORY_COLORS[c] ?? CATEGORY_COLORS._default;
}

export default function InsightsOverviewChart({
  data,
  forecast = {},
  height = 320,
  range = "24h",
}: any) {

  const theme = useUserStore((s) => s.theme);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const textColor = isDark ? "#ddd" : "#333";
  const gridColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
  const tooltipBg = isDark ? "#222" : "#fff";

  const { series, categories } = useMemo(() => {

    const hoursSet = new Set<string>();

    (data || []).forEach((cat: any) => {
      (cat.points || []).forEach((p: any) => {
        if (p?.date) {
          const d = new Date(p.date);
          hoursSet.add(d.getHours() + ":00");
        }
      });
    });

    const hours = Array.from(hoursSet).sort((a, b) => {
      const ha = parseInt(a);
      const hb = parseInt(b);
      return ha - hb;
    });

    const s: any[] = [];

    (data || []).forEach((cat: any) => {

      const label = cat?.category ?? "Ismeretlen";
      const color = getCategoryColor(label);

      const map: Record<string, number> = {};

      (cat.points || []).forEach((p: any) => {
        const d = new Date(p.date);
        const h = d.getHours() + ":00";

        const val =
          typeof p?.count === "number"
            ? p.count
            : Number(p?.count) || 0;

        map[h] = val;
      });

      const row = hours.map((h) => map[h] ?? 0);

      s.push({
        name: label,
        data: row,
        color,
      });

    });

    return { series: s, categories: hours };

  }, [data]);

  const options: any = {

    chart: {
      type: "bar",
      stacked: true,
      toolbar: { show: false },
      foreColor: textColor,
      animations: { enabled: false },
    },

    theme: {
      mode: isDark ? "dark" : "light",
    },

    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "70%",
      },
    },

    grid: {
      borderColor: gridColor,
    },

    legend: {
      position: "bottom",
      labels: {
        colors: textColor,
      },
    },

    xaxis: {
      categories,
      labels: {
        style: { colors: textColor },
      },
    },

    yaxis: {
      min: 0,
      labels: {
        style: { colors: textColor },
      },
    },

    tooltip: {
      theme: isDark ? "dark" : "light",
      y: {
        formatter: (val: number, opts: any) => {
          const name = opts.seriesIndex !== undefined
            ? opts.w.config.series[opts.seriesIndex].name
            : "";
          return `${name}: ${val} cikk`;
        },
      },
    },

  };

  const stableKey = `${theme}-${categories.length}`;

  return (
    <div style={{ width: "100%", height }}>
      <ReactApexChart
        key={stableKey}
        options={options}
        series={series}
        type="bar"
        height={height}
      />
    </div>
  );
}