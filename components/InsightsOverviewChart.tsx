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
import { hu } from "date-fns/locale";
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

  // ⭐ Prémium AI előrejelzés szín
  const aiColor = "#9b5de5AA";

  // ⭐ MOST időpont UTC-ben
  const nowLocal = new Date();
  const nowUtc = new Date(nowLocal.getTime() - nowLocal.getTimezoneOffset() * 60000);

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

  const { datasets } = useMemo(() => {
    if (!data || data.length === 0) return { datasets: [] };

    const datasets: any[] = [];

    // 🔵 1) Valós adatok – nem szűrjük, csak megjelenítjük
    data.forEach((cat, idx) => {
      datasets.push({
        label: cat.category,
        data: cat.points.map((p) => ({
          x: new Date(p.date), // UTC → local automatikusan
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

    // 🔮 2) AI előrejelzés – 1 dataset, pontok kategória színnel
    const aiPoints: any[] = [];
    const aiPointColors: string[] = [];
    const aiCategories: string[] = [];

    Object.entries(forecast || {}).forEach(([catName, fc], idx) => {
      const color = palette[idx % palette.length];

      (fc as any[]).forEach((p) => {
        const d = new Date(p.date); // UTC timestamp

        // Csak jövőbeli pontokat rajzolunk
        if (d.getTime() >= nowUtc.getTime()) {
          aiPoints.push({ x: d, y: p.predicted });
          aiPointColors.push(color);
          aiCategories.push(catName);
        }
      });
    });

    if (aiPoints.length > 0) {
      datasets.push({
        label: "AI előrejelzés",
        data: aiPoints,
        borderColor: aiColor,
        borderDash: [6, 6],
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: aiPointColors,
        pointBorderColor: aiPointColors,
        fill: false,
        _aiCategories: aiCategories,
      });
    }

    return { datasets };
  }, [data, forecast]);

  if (!datasets || datasets.length === 0) return null;

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
        adapters: {
          date: { locale: hu },
        },
        time: {
          unit: "hour",
          displayFormats: { hour: "HH:mm" },
        },
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
          // ⭐ MAGYAR IDŐ
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

          label: function (ctx: any) {
            const ds = ctx.dataset;
            const idx = ctx.dataIndex;

            if (ds.label === "AI előrejelzés") {
              const cat = ds._aiCategories?.[idx];
              if (cat) {
                return `AI előrejelzés – ${cat}: ${ctx.parsed.y}`;
              }
              return `AI előrejelzés: ${ctx.parsed.y}`;
            }

            return `${ds.label}: ${ctx.parsed.y}`;
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
      <Line data={{ datasets }} options={options} />
    </div>
  );
}
