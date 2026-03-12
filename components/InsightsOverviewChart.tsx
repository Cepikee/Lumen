"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useUserStore } from "@/store/useUserStore";
import "chartjs-adapter-date-fns";

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
  height = 300,
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

  const { series } = useMemo(() => {

    const s: any[] = [];

    // HISTORY
    (data || []).forEach((cat: any) => {

      const label = cat?.category ?? "Ismeretlen";
      const color = getCategoryColor(label);

      const points = Array.isArray(cat?.points) ? cat.points : [];

      const formatted = points
        .map((p: any) => {
          const dateVal = p?.date ? new Date(p.date) : null;
          const countVal =
            typeof p?.count === "number"
              ? p.count
              : Number(p?.count) || 0;

          return dateVal ? [dateVal.getTime(), countVal] : null;
        })
        .filter(Boolean);

      s.push({
        name: label,
        data: formatted,
        color,
        _isForecast: false,
      });

    });

    // AI FORECAST
    if (range === "24h" && forecast && typeof forecast === "object") {

      const VALID_CATEGORIES = Object.keys(CATEGORY_COLORS).filter(
        (k) => k !== "_default"
      );

      Object.entries(forecast).forEach(([catName, fc]: any) => {

        if (!VALID_CATEGORIES.includes(catName)) return;

        const series = Array.isArray(fc) ? fc : [];
        const color = getCategoryColor(catName);

        const formatted = series
          .map((p: any) => {

            const date = p?.date ? new Date(p.date) : null;

            const pred =
              typeof p?.predicted === "number"
                ? p.predicted
                : Number(p?.predicted) || 0;

            return date ? [date.getTime(), pred] : null;

          })
          .filter(Boolean);

        s.push({
          name: `AI előrejelzés · ${catName}`,
          data: formatted,
          color,
          dashArray: 6,
          _isForecast: true,
          _aiCategory: catName,
        });

      });
    }

    return { series: s };

  }, [data, forecast, range]);

  const options: any = {

    chart: {
      type: "line",
      zoom: {
        enabled: true,
        type: "x",
        autoScaleYaxis: false,
      },
      toolbar: {
        show: true,
      },
      foreColor: textColor,
      animations: {
        enabled: false,
      },
    },

    theme: {
      mode: isDark ? "dark" : "light",
    },

    stroke: {
      width: 2,
      curve: "smooth",
      dashArray: series.map((s: any) => (s._isForecast ? 6 : 0)),
    },

    markers: {
      size: 0,
      hover: {
        size: 6,
      },
    },

    grid: {
      borderColor: gridColor,
    },

    legend: {
      position: "top",
      labels: {
        colors: textColor,
      },
    },

    tooltip: {
      theme: isDark ? "dark" : "light",
      style: {
        fontSize: "12px",
      },
      x: {
        format: "yyyy.MM.dd HH:mm:ss",
      },
      custom: function ({ series, seriesIndex, dataPointIndex, w }: any) {

        const ds = w.config.series[seriesIndex];
        const value = series[seriesIndex][dataPointIndex];

        if (ds._isForecast) {
          return `<div style="padding:8px">
          AI előrejelzés · ${ds._aiCategory}: <b>${value}</b>
          </div>`;
        }

        return `<div style="padding:8px">
          ${ds.name}: <b>${value}</b>
        </div>`;
      },
    },

    xaxis: {
      type: "datetime",
      labels: {
        style: {
          colors: textColor,
        },
      },
    },

    yaxis: {
      min: 0,
      labels: {
        style: {
          colors: textColor,
        },
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