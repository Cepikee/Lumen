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

// ⭐ CROSSHAIR PLUGIN – Chart.js 4.x kompatibilis, tooltip-barát
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
    ctx.strokeStyle = "#8884"; // prémium halvány crosshair
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
  height = 300,
}: {
  data: CategorySeries[];
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

    return {
      datasets: data.map((cat, idx) => ({
        label: cat.category,
        data: cat.points.map((p) => ({
          x: new Date(p.date),
          y: p.count,
        })),
        borderColor: palette[idx % palette.length],
        backgroundColor: palette[idx % palette.length] + "33",
        borderWidth: 2,
        tension: 0.3,

        // ⭐ Láthatatlan, nagy hover-hitbox → 7 napos módban is tökéletes
        pointRadius: 0,
        pointHitRadius: 20,
        hoverRadius: 20,
        hitRadius: 20,

        fill: false,
      })),
    };
  }, [data]);

  if (!chartData) return null;

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,

    // ⭐ Legend + vonalak smooth animáció
    animations: {
      colors: { type: "color", duration: 300 },
      numbers: { type: "number", duration: 300 },
    },

    animation: { duration: 300, easing: "easeOutQuart" },

    // ⭐ A teljes vonal hoverelhető → TradingView-szintű UX
    interaction: {
      mode: "nearest",
      intersect: false,
    },

    scales: {
      x: {
        type: "time",
        time: {
          unit: "hour",
          displayFormats: { hour: "HH:mm" },
        },
        ticks: { color: textColor, maxRotation: 0 },
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

        // ⭐ MA / TEGNAP / dátum + óra
        callbacks: {
          title: function (items: any) {
            const d = new Date(items[0].parsed.x);
            const now = new Date();

            const isToday =
              d.getFullYear() === now.getFullYear() &&
              d.getMonth() === now.getMonth() &&
              d.getDate() === now.getDate();

            const yesterday = new Date();
            yesterday.setDate(now.getDate() - 1);

            const isYesterday =
              d.getFullYear() === yesterday.getFullYear() &&
              d.getMonth() === yesterday.getMonth() &&
              d.getDate() === yesterday.getDate();

            if (isToday)
              return (
                "Ma " +
                d.toLocaleTimeString("hu-HU", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              );

            if (isYesterday)
              return (
                "Tegnap " +
                d.toLocaleTimeString("hu-HU", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              );

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
      <Line data={chartData} options={options} />
    </div>
  );
}
