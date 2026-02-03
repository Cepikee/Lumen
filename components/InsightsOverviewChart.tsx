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

// ⭐ STEP-LINE KITÖLTÉS: minden órára pont, ha nincs adat → előző érték
function fillHourly(points: Point[]): Point[] {
  if (points.length === 0) return [];

  const sorted = [...points].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const start = new Date(sorted[0].date).getTime();
  const end = new Date(sorted[sorted.length - 1].date).getTime();
  const step = 60 * 60 * 1000;

  const pointMap = new Map<number, number>();
  for (const p of sorted) {
    const ts = new Date(p.date).getTime();
    pointMap.set(ts, p.count);
  }

  const result: Point[] = [];
  let lastValue = sorted[0].count;

  for (let t = start; t <= end; t += step) {
    if (pointMap.has(t)) {
      lastValue = pointMap.get(t)!;
    }

    result.push({
      date: new Date(t).toISOString(),
      count: lastValue, // ⭐ előző érték továbbvitele
    });
  }

  return result;
}

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
      datasets: data.map((cat, idx) => {
        const densePoints = fillHourly(cat.points);

        return {
          label: cat.category,
          data: densePoints.map((p) => ({
            x: new Date(p.date),
            y: p.count,
          })),
          borderColor: palette[idx % palette.length],
          backgroundColor: palette[idx % palette.length] + "33",
          borderWidth: 2,
          tension: 0.3,

          pointRadius: 0,
          pointHitRadius: 20,
          hoverRadius: 20,
          hitRadius: 20,

          fill: false,
        };
      }),
    };
  }, [data]);

  if (!chartData) return null;

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,

    interaction: {
      mode: "nearest",
      intersect: false,
    },

    animations: {
      colors: { type: "color", duration: 300 },
      numbers: { type: "number", duration: 300 },
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
