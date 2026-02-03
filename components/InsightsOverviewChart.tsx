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

  const aiLineColor = "#9b5de5AA";

  const { datasets } = useMemo(() => {
    if (!data || data.length === 0) return { datasets: [] };

    const datasets: any[] = [];

    // 🔵 1) Valós adatok – ahogy jönnek, nem szűrjük idő szerint itt
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

    // 🔮 2) AI előrejelzés – 1 dataset, pontok kategória színnel

    // referenciapont: legkésőbbi valós adat ideje
    const allRealDates = data.flatMap((cat) =>
      cat.points.map((p) => new Date(p.date).getTime())
    );
    const latestReal =
      allRealDates.length > 0 ? new Date(Math.max(...allRealDates)) : new Date();

    const aiPoints: any[] = [];
    const aiPointColors: string[] = [];
    const aiCategories: string[] = [];

    Object.entries(forecast || {}).forEach(([catName, fc], idx) => {
      const color = palette[idx % palette.length];

      (fc as any[]).forEach((p) => {
        const d = new Date(p.date);
        // csak a legutolsó valós adat UTÁNI pontokat rajzoljuk
        if (d.getTime() >= latestReal.getTime()) {
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
        borderColor: aiLineColor,
        borderDash: [6, 6],
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: aiPointColors,
        pointBorderColor: aiPointColors,
        fill: false,
        _aiCategories: aiCategories, // tooltiphez
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
