// components/InsightsOverviewChart.tsx

"use client";

import React, { useMemo, useRef } from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useUserStore } from "@/store/useUserStore";

/**
 * Átalakítás Chart.js -> ApexCharts
 * - Megtartja az eredeti logikát: kategóriánkénti sorozatok, AI előrejelzés külön sorozatként (szaggatott),
 *   sima görbe (smooth), tooltip/legend viselkedés, dark mode színek, zoom/pan, crosshair.
 *
 * Props (megegyezik az eredeti komponensével):
 *  - data: [{ category: string, points: [{ date, count }] }, ...]
 *  - forecast: { [category]: [{ date, predicted }] } (opcionális)
 *  - height: number
 *  - range: "24h" | "7d" | "30d" | ...
 *
 * Megjegyzés: ApexCharts sorozatoknál a `data` formátuma: [{ x: number (timestamp), y: number|null }, ...]
 */

type Point = { date: string | number | Date; count: number | string };
type SeriesItem = { category?: string; points?: Point[] };
type ForecastMap = Record<string, { date: string | number | Date; predicted: number | string }[]>;

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

/* Meta típus a sorozatokhoz (későbbi legend logika miatt) */
interface SeriesMeta {
  name: string;
  _isForecast?: boolean;
  _isDummyAiLegend?: boolean;
  _aiCategory?: string;
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
  const gridColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";

  // chartRef a programatikus vezérléshez (legend toggle)
  const chartRef = useRef<any>(null);

  // Előkészítjük a sorozatokat: history sorozatok + forecast sorozatok
  const { series, seriesMeta } = useMemo(() => {
    const s: any[] = [];
    const meta: SeriesMeta[] = [];

    // HISTORY
    (data || []).forEach((cat: SeriesItem) => {
      const label = cat?.category ?? "Ismeretlen";
      const color = getCategoryColor(label);
      const points = Array.isArray(cat?.points) ? cat.points : [];

      const mapped = points
        .map((p: any) => {
          const dateVal = p?.date ? new Date(p.date) : null;
          const countVal = typeof p?.count === "number" ? p.count : Number(p?.count) || 0;
          return dateVal ? { x: dateVal.getTime(), y: countVal } : null;
        })
        .filter(Boolean);

      s.push({
        name: label,
        type: "line",
        data: mapped,
        stroke: {
          curve: "smooth" as const,
          width: 1.5,
        },
        marker: {
          size: 0,
        },
        // szín kezelése az options.stroke.colors-ban is történik, de itt is megadható
        colors: color,
      });
      meta.push({ name: label });
    });

    // AI FORECAST – csak 24h (megtartjuk az eredeti szűrést)
    if (range === "24h" && forecast && typeof forecast === "object") {
      const VALID_CATEGORIES = Object.keys(CATEGORY_COLORS).filter((k) => k !== "_default");
      Object.entries(forecast).forEach(([catName, fc]: any) => {
        if (!VALID_CATEGORIES.includes(catName)) return;
        const seriesArr = Array.isArray(fc) ? fc : [];
        const color = getCategoryColor(catName);

        const mapped = seriesArr
          .map((p: any) => {
            const date = p?.date ? new Date(p.date) : null;
            const pred = typeof p?.predicted === "number" ? p.predicted : Number(p?.predicted) || 0;
            return date ? { x: date.getTime(), y: pred } : null;
          })
          .filter(Boolean);

        s.push({
          name: `AI előrejelzés · ${catName}`,
          type: "line",
          data: mapped,
          stroke: {
            curve: "smooth" as const,
            width: 1.2,
            dashArray: 6,
          },
          marker: { size: 0 },
          colors: color,
        });
        meta.push({ name: `AI előrejelzés · ${catName}`, _isForecast: true, _aiCategory: catName });
      });

      // dummy AI legend
      s.push({
        name: "AI előrejelzés",
        type: "line",
        data: [],
        stroke: { curve: "smooth" as const, width: 2, dashArray: 6 },
        marker: { size: 0 },
        colors: "#999",
      });
      meta.push({ name: "AI előrejelzés", _isForecast: true, _isDummyAiLegend: true });
    }

    return { series: s, seriesMeta: meta };
  }, [data, forecast, range]);

  // Apex options - típusozva ApexOptions-ként
  const options: ApexOptions = useMemo(() => {
    return {
      chart: {
        id: "insights-overview",
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true,
          },
        },
        zoom: { enabled: true, type: "x", autoScaleYaxis: true },
        animations: { enabled: true },
        events: {
          legendClick: function (chartContext: any, seriesIndex: number, config: any) {
            try {
              const meta = seriesMeta[seriesIndex] || {};
              if (meta._isDummyAiLegend) {
                const forecastIndexes = seriesMeta
                  .map((m, i) => (m._isForecast && !m._isDummyAiLegend ? i : -1))
                  .filter((i) => i >= 0);
                forecastIndexes.forEach((i) => {
                  const name = chartContext.w.globals.seriesNames[i];
                  chartContext.toggleSeries(name);
                });
                return false;
              }
            } catch (e) {
              // ignore
            }
            return true;
          },
        },
      },
      stroke: {
        curve: "smooth" as const,
        width: 1.5,
        colors: series.map((s: any) => (s.colors ? String(s.colors) : undefined)),
      },
      markers: {
        hover: { sizeOffset: 4 },
      },
      xaxis: {
        type: "datetime",
        labels: {
          style: { colors: textColor },
          datetimeUTC: false,
        },
        tooltip: { enabled: false },
        axisBorder: { color: gridColor },
        axisTicks: { color: gridColor },
      },
      yaxis: {
        labels: { style: { colors: textColor } },
        min: 0,
      },
      grid: {
        borderColor: gridColor,
      },
      tooltip: {
        theme: isDark ? "dark" : "light",
        x: {
          show: true,
          formatter: function (val: any) {
            try {
              const d = new Date(val);
              return d.toLocaleString("hu-HU", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
            } catch {
              return String(val);
            }
          },
        },
        y: {
          formatter: function (val: any, opts: any) {
            const seriesName = opts.seriesName || "";
            if (seriesName.toLowerCase().includes("ai előrejelzés") || seriesName.toLowerCase().includes("ai")) {
              return `${val} (előrejelzés)`;
            }
            return `${seriesName}: ${val}`;
          },
        },
        marker: { show: true },
        fillSeriesColor: false,
      },
      legend: {
        labels: { colors: textColor },
        onItemClick: {
          toggleDataSeries: true,
        },
      },
      annotations: {
        xaxis: [],
      },
      responsive: [
        {
          breakpoint: 768,
          options: {
            legend: { position: "bottom" },
          },
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, textColor, gridColor, series, seriesMeta]);

  // Ha nincs adat, fallback
  if (!series || series.length === 0) {
    return <div style={{ width: "100%", height }}>Nincs megjeleníthető adat</div>;
  }

  return (
    <div style={{ width: "100%", height }}>
      <ReactApexChart ref={chartRef} options={options} series={series} type="line" height={height} />
    </div>
  );
}
