// ⭐ A LÉNYEG: időablak szűrés + zoom limit + min/max
// (a többi változatlan marad)

"use client";

import {
  Chart as ChartJS,
  BarElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  CategoryScale,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import "chartjs-adapter-date-fns";
import { hu } from "date-fns/locale";
import { Bar } from "react-chartjs-2";
import { useMemo } from "react";
import { useUserStore } from "@/store/useUserStore";

ChartJS.register(
  BarElement,
  LinearScale,
  TimeScale,
  CategoryScale,
  Tooltip,
  Legend,
  zoomPlugin
);

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

function toLocalBucketKey(d: Date) {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0") +
    " " +
    String(d.getHours()).padStart(2, "0") +
    ":00:00"
  );
}

function aggregatePoints(points: any[], range: string) {
  const bucket: Record<string, number> = {};

  points.forEach((p) => {
    if (!p?.date) return;

    const d = new Date(p.date);

    if (range === "24h") {
      d.setMinutes(0, 0, 0);
    } else {
      d.setHours(0, 0, 0, 0);
    }

    const key = toLocalBucketKey(d);

    const v =
      typeof p?.count === "number"
        ? p.count
        : Number(p?.count) || 0;

    bucket[key] = (bucket[key] || 0) + v;
  });

  return Object.entries(bucket).map(([k, v]) => ({
    x: new Date(k),
    y: v,
  }));
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

  const gridColor = isDark
    ? "rgba(255,255,255,0.15)"
    : "rgba(0,0,0,0.12)";

  // ⭐ Dinamikus időablak
  const now = new Date();

  const startHour = new Date(now);
  startHour.setMinutes(0, 0, 0);

  const endHour = new Date(startHour);
  endHour.setDate(endHour.getDate() + 1);

  const { datasets } = useMemo(() => {

    const ds: any[] = [];

    // ⭐ Segédfüggvény: időablak szűrés
    const filterRange = (arr: any[]) =>
      arr.filter(p => p.x >= startHour && p.x <= endHour);

    // HISTORY
    (data || []).forEach((cat: any) => {

      const label = cat?.category ?? "Ismeretlen";
      const color = getCategoryColor(label);
      const points = Array.isArray(cat?.points) ? cat.points : [];

      let aggregated = aggregatePoints(points, range);

      // ⭐ SZŰRÉS: csak a startHour–endHour közötti pontok maradnak
      aggregated = filterRange(aggregated);

      ds.push({
        label,
        data: aggregated,
        backgroundColor: color,
        borderWidth: 0,
        stack: "news",
        barThickness: 18,
        maxBarThickness: 22,
      });

    });

    // AI FORECAST
    if (range === "24h" && forecast && typeof forecast === "object") {

      const VALID_CATEGORIES = Object.keys(CATEGORY_COLORS).filter(
        k => k !== "_default"
      );

      Object.entries(forecast).forEach(([catName, fc]: any) => {

        if (!VALID_CATEGORIES.includes(catName)) return;

        const color = getCategoryColor(catName);
        const series = Array.isArray(fc) ? fc : [];

        let aggregated = series.map((p: any) => {

          const date = p?.date 
          ? new Date(p.date.replace(" ", "T"))
          : null;

          const pred =
            typeof p?.predicted === "number"
              ? p.predicted
              : Number(p?.predicted) || 0;

          return date ? { x: date, y: pred } : null;

        }).filter(Boolean);

        // ⭐ SZŰRÉS: forecast is csak a tartományon belül
        aggregated = filterRange(aggregated);

        ds.push({
          label: "AI előrejelzés",
          data: aggregated,
          backgroundColor: color + "80",
          borderColor: color + "CC",
          borderWidth: 2,
          borderDash: [4, 4],
          stack: "forecast",
          _isForecast: true,
          _aiCategory: catName,
          barThickness: 18,
          maxBarThickness: 22,
          order: 99,
        });

      });

      ds.push({
        label: "AI előrejelzés",
        data: [],
        backgroundColor: "#9994",
        borderColor: "#999",
        borderDash: [6, 6],
        borderWidth: 2,
        stack: "forecast",
        _isDummyAiLegend: true,
        _isForecast: true,
      });

    }

    return { datasets: ds };

  }, [data, forecast, range]);

  const options: any = {

    responsive: true,
    maintainAspectRatio: false,
    animation: false,

    interaction: {
      mode: "nearest",
      intersect: false
    },

    scales: {

      x: {
        type: "time",
        stacked: true,
        adapters: { date: { locale: hu } },

        min: startHour,
        max: endHour,

        time: {
          unit: "hour",
          displayFormats: {
            hour: "HH:mm",
          }
        },

        ticks: { color: textColor },
        grid: { color: gridColor },
      },

      y: {
        stacked: true,
        beginAtZero: true,
        ticks: { color: textColor },
        grid: { color: gridColor },
      },

    },

    plugins: {

      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: "x",
          limits: {
            x: { min: startHour, max: endHour },
          },
        },
        pan: {
          enabled: true,
          mode: "x",
          limits: {
            x: { min: startHour, max: endHour },
          },
        },
      },

    },

  };

  return (
    <div style={{ width: "100%", height }}>
      <Bar key={range + theme} data={{ datasets }} options={options} />
    </div>
  );
}
