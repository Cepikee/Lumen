"use client";

import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import "chartjs-adapter-date-fns";
import { Line } from "react-chartjs-2";
import { useMemo } from "react";

// ⭐ CROSSHAIR PLUGIN
const crosshairPlugin = {
  id: "crosshair",
  afterDatasetsDraw(chart: any) {
    const active = chart.tooltip?.getActiveElements?.();
    if (!active || active.length === 0) return;

    const ctx = chart.ctx;
    const { x } = active[0].element;
    const topY = chart.chartArea.top;
    const bottomY = chart.chartArea.bottom;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x, bottomY);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#8884";
    ctx.stroke();
    ctx.restore();
  },
};

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin,
  crosshairPlugin
);

type Point = { date: string; count: number };
type CategorySeries = { category: string; points: Point[] };

export default function InsightsOverviewChart({
  data,
  forecast = {},
  height = 300,
}: {
  data: CategorySeries[];
  forecast?: any;
  height?: number;
}) {
  const isDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const textColor = isDark ? "#ddd" : "#333";
  const gridColor = isDark ? "#444" : "#eee";

  const palette = [
    "#ff6b6b",
    "#4dabf7",
    "#ffd166",
    "#06d6a0",
    "#9b5de5",
    "#f06595",
    "#00c2d1",
    "#ff922b",
  ];

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const datasets: any[] = [];

    // 🔵 1) Valós adatok
    data.forEach((cat, idx) => {
      datasets.push({
        label: cat.category,
        data: cat.points.map((p) => ({
          x: new Date(p.date),
          y: p.count,
        })),
        borderColor: palette[idx % palette.length],
        backgroundColor: palette[idx % palette.length] + "33",
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
        fill: false,
      });
    });

    // 🔮 2) Összevont AI előrejelzés
    const forecastSum: Record<string, number> = {};

    Object.values(forecast || {}).forEach((fc: any) => {
      fc.forEach((p: any) => {
        const key = p.date;
        forecastSum[key] = (forecastSum[key] || 0) + p.predicted;
      });
    });

    const forecastPoints = Object.entries(forecastSum).map(([date, sum]) => ({
      x: new Date(date),
      y: sum,
    }));

    if (forecastPoints.length > 0) {
      datasets.push({
        label: "AI előrejelzés (összesített)",
        data: forecastPoints,
        borderColor: "#8888AA",
        borderDash: [6, 6],
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 3,
        fill: false,
      });
    }

    return { datasets, forecastPoints };
  }, [data, forecast]);

  if (!chartData) return null;

  // ⏱️ Automatikus időskála kiterjesztés
  const allDates = [
    ...data.flatMap((cat) => cat.points.map((p) => new Date(p.date))),
    ...chartData.forecastPoints.map((p) => p.x),
  ];

  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,

    interaction: {
      mode: "nearest",
      intersect: false,
    },

    animation: { duration: 300, easing: "easeOutQuart" },

    scales: {
      x: {
        type: "time",
        time: {
          unit: "hour",
          displayFormats: { hour: "HH:mm" },
        },
        min: minDate,
        max: maxDate,
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
      y: {
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
    },

    plugins: {
      legend: { labels: { color: textColor } },

      tooltip: {
        enabled: true,
        backgroundColor: isDark ? "#222" : "#fff",
        titleColor: isDark ? "#fff" : "#000",
        bodyColor: isDark ? "#ddd" : "#333",
        borderColor: isDark ? "#444" : "#ccc",
        borderWidth: 1,

        callbacks: {
          title: function (items: any) {
            const d = new Date(items[0].parsed.x);

            return d.toLocaleString("hu-HU", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
          },
        },
      },

      zoom: {
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
        pan: { enabled: true, mode: "x" },
      },
    },
  };

  return (
    <div style={{ width: "100%", height }}>
      <Line data={{ datasets: chartData.datasets }} options={options} />
    </div>
  );
}
