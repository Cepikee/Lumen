// components/InsightsOverviewChart.tsx

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useUserStore } from "@/store/useUserStore";

/**
 * ApexCharts verzió az eredeti Chart.js InsightsOverviewChart helyett.
 * - Megtartja az eredeti logikát: history sorozatok + AI előrejelzés sorozatok (külön sorozatként).
 * - Típuskompatibilis ApexOptions használat.
 * - Biztonságos render: a chart csak akkor mountolódik, ha a wrappernek tényleges mérete van.
 * - A sorozatokhoz színek, stroke width és dashArray tömböket állítunk elő, hogy per-sorozat beállítások működjenek.
 *
 * Props:
 *  - data: [{ category, points: [{ date, count }] }, ...]
 *  - forecast: { [category]: [{ date, predicted }] } (opcionális)
 *  - height: number
 *  - range: "24h" | "7d" | "30d" | ...
 */

type Point = { date: string | number | Date; count: number | string };
type SeriesItem = { category?: string; points?: Point[] };

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
  const gridColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";

  // wrapper méret ellenőrzéshez
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const [canRenderChart, setCanRenderChart] = useState(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) {
      setCanRenderChart(false);
      return;
    }

    const check = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setCanRenderChart(w > 0 && h > 0);
    };

    check();

    const ro = new ResizeObserver(() => check());
    ro.observe(el);

    window.addEventListener("resize", check);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", check);
    };
  }, []);

  // Sorozatok előállítása: egyszerű, típusbiztos formátum az Apex számára
  const { series, colors, strokeWidths, dashArray } = useMemo(() => {
    const s: { name: string; data: { x: number; y: number | null }[] }[] = [];
    const cols: string[] = [];
    const widths: number[] = [];
    const dashes: number[] = [];

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
        .filter(Boolean) as { x: number; y: number }[];

      s.push({ name: label, data: mapped });
      cols.push(color);
      widths.push(1.5);
      dashes.push(0);
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
          .filter(Boolean) as { x: number; y: number }[];

        // ha nincs adat, ne adjuk hozzá
        if (mapped.length > 0) {
          s.push({ name: `AI előrejelzés · ${catName}`, data: mapped });
          cols.push(color);
          widths.push(1.2);
          dashes.push(6);
        }
      });

      // dummy AI legend (ha szeretnéd, hogy legyen egy "AI előrejelzés" legend entry)
      // csak akkor add hozzá, ha legalább egy forecast sorozat van
      const hasForecast = Object.keys(forecast || {}).length > 0;
      if (hasForecast) {
        s.push({ name: "AI előrejelzés", data: [] });
        cols.push("#999");
        widths.push(2);
        dashes.push(6);
      }
    }

    return { series: s, colors: cols, strokeWidths: widths, dashArray: dashes };
  }, [data, forecast, range]);

  // Apex options - típusos
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
      },
      stroke: {
        // curve lehet 'smooth' | 'straight' | 'stepline' | 'linestep' | 'monotoneCubic'
        curve: "smooth",
        // per-series width és dashArray megadása tömbként
        width: strokeWidths.length > 0 ? strokeWidths : undefined,
        dashArray: dashArray.length > 0 ? dashArray : undefined,
      },
      markers: {
        hover: { sizeOffset: 4 },
      },
      colors: colors.length > 0 ? colors : undefined,
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
      responsive: [
        {
          breakpoint: 768,
          options: {
            legend: { position: "bottom" },
          },
        },
      ],
    };
  }, [isDark, textColor, gridColor, colors, strokeWidths, dashArray]);

  // Ha nincs adat, fallback
  if (!series || series.length === 0) {
    return <div style={{ width: "100%", height }}>Nincs megjeleníthető adat</div>;
  }

  return (
    <div ref={wrapperRef} style={{ width: "100%", height, minHeight: 200 }}>
      {canRenderChart ? (
        <ReactApexChart ref={chartRef} options={options} series={series} type="line" height={height} />
      ) : (
        // placeholder, amíg a wrapper mérete 0 volt
        <div style={{ width: "100%", height: "100%" }} />
      )}
    </div>
  );
}
