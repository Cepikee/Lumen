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
  const gridColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";

  const { series, dash } = useMemo(() => {

    const s: any[] = [];
    const dashArr: number[] = [];

    // HISTORY
    (data || []).forEach((cat: any) => {

      const label = cat?.category ?? "Ismeretlen";
      const color = getCategoryColor(label);

      const points = Array.isArray(cat?.points) ? cat.points : [];

      const formatted = points.map((p: any) => {

        const dateVal = p?.date ? new Date(p.date) : null;

        const countVal =
          typeof p?.count === "number"
            ? p.count
            : Number(p?.count) || 0;

        // ⭐ 0 -> null (ne rajzoljon)
        if (!dateVal || countVal === 0) {
          return [dateVal?.getTime(), null];
        }

        return [dateVal.getTime(), countVal];

      });

      s.push({
        name: label,
        data: formatted,
        color,
      });

      dashArr.push(0);

    });

    // FORECAST
    if (range === "24h" && forecast && typeof forecast === "object") {

      const VALID_CATEGORIES = Object.keys(CATEGORY_COLORS).filter(
        (k) => k !== "_default"
      );

      Object.entries(forecast).forEach(([catName, fc]: any) => {

        if (!VALID_CATEGORIES.includes(catName)) return;

        const color = getCategoryColor(catName);
        const series = Array.isArray(fc) ? fc : [];

        const formatted = series.map((p: any) => {

          const date = p?.date ? new Date(p.date) : null;

          const pred =
            typeof p?.predicted === "number"
              ? p.predicted
              : Number(p?.predicted) || 0;

          if (!date || pred === 0) {
            return [date?.getTime(), null];
          }

          return [date.getTime(), pred];

        });

        s.push({
          name: `AI előrejelzés · ${catName}`,
          data: formatted,
          color,
        });

        dashArr.push(6);

      });

    }

    return { series: s, dash: dashArr };

  }, [data, forecast, range]);

  const options: any = {

    chart: {
      type: "line",
      height,
      toolbar: { show: true },
      zoom: {
        enabled: true,
        type: "x",
      },
      foreColor: textColor,
      animations: { enabled: false },
    },

    theme: {
      mode: isDark ? "dark" : "light",
    },

    stroke: {
      curve: "smooth",
      width: 2.2,
      dashArray: dash,
    },

    grid: {
      borderColor: gridColor,
      strokeDashArray: 3,
    },

    markers: {
      size: 0,
      hover: {
        size: 6,
        sizeOffset: 2,
      },
    },

    legend: {
      position: "top",
      horizontalAlign: "left",
      labels: {
        colors: textColor,
      },
    },

    tooltip: {
      shared: true,
      intersect: false,
      theme: isDark ? "dark" : "light",
      x: {
        format: "yyyy.MM.dd HH:mm:ss",
      },
    },

    xaxis: {
      type: "datetime",

      crosshairs: {
        show: true,
        stroke: {
          width: 1,
          dashArray: 3,
        },
      },

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

    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 0.3,
        opacityFrom: 0.35,
        opacityTo: 0,
        stops: [0, 90, 100],
      },
    },

  };

  const stableKey = `${range}-${theme}`;

  return (
    <div style={{ width: "100%", height }}>
      <ReactApexChart
        key={stableKey}
        options={options}
        series={series}
        type="line"
        height={height}
      />
    </div>
  );
}