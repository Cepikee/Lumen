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

/** ⭐ HELYI IDŐ → BUCKET kulcs (nem UTC!) */
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

    /** ❗ FIX: nem toISOString(), hanem helyi idő */
    const key = toLocalBucketKey(d);

    const v =
      typeof p?.count === "number"
        ? p.count
        : Number(p?.count) || 0;

    bucket[key] = (bucket[key] || 0) + v;
  });

  return Object.entries(bucket).map(([k, v]) => ({
    x: new Date(k), // helyi idő → helyes
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

  const { datasets } = useMemo(() => {

    const ds: any[] = [];

    // HISTORY
    (data || []).forEach((cat: any) => {

      const label = cat?.category ?? "Ismeretlen";
      const color = getCategoryColor(label);
      const points = Array.isArray(cat?.points) ? cat.points : [];

      const aggregated = aggregatePoints(points, range);

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

        const aggregated = series.map((p: any) => {

          const date = p?.date 
          ? new Date(p.date.replace(" ", "T"))
          : null;



          const pred =
            typeof p?.predicted === "number"
              ? p.predicted
              : Number(p?.predicted) || 0;

          return date ? { x: date, y: pred } : null;

        }).filter(Boolean);

        ds.push({
          label: "AI előrejelzés",
          data: aggregated,
          backgroundColor: color + "80",
          borderColor: color + "CC",
          borderWidth: 1,
          borderDash: [4, 4],
          stack: "forecast",
          _isForecast: true,
          _aiCategory: catName,
          barThickness: 18,
          maxBarThickness: 22,
          order: 99,
        });

      });

      /** ⭐ DUMMY AI LEGEND */
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

        time: {
          unit: range === "24h" ? "hour" : "day",
          displayFormats: {
            hour: "HH:mm",
            day: "yyyy.MM.dd",
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

      legend: {
        labels: {
          color: textColor,
          generateLabels: (chart: any) => {
            const original =
              ChartJS.defaults.plugins.legend.labels.generateLabels(chart);

            return original.filter((item: any) => {
              const ds = chart.data.datasets[item.datasetIndex];
              if (!ds) return false;

              if (!ds._isForecast) return true;
              if (ds._isDummyAiLegend) return true;

              return false;
            });
          },
        },

        onClick: (e: any, item: any, legend: any) => {
          const chart = legend.chart;
          const idx = item.datasetIndex;
          const ds = chart.data.datasets[idx];

          // History → normál toggle
          if (!ds._isForecast) {
            const visible = chart.isDatasetVisible(idx);
            chart.setDatasetVisibility(idx, !visible);
            chart.update();
            return;
          }

          // Dummy AI legend → toggle all AI datasets
          if (ds._isDummyAiLegend) {
            const anyVisible = chart.data.datasets.some(
              (d: any, i: number) =>
                d._isForecast &&
                !d._isDummyAiLegend &&
                chart.isDatasetVisible(i)
            );

            chart.data.datasets.forEach((d: any, i: number) => {
              if (d._isForecast && !d._isDummyAiLegend) {
                chart.setDatasetVisibility(i, !anyVisible);
              }
            });

            chart.update();
            return;
          }
        },
      },

      tooltip: {

        backgroundColor: isDark ? "#222" : "#fff",
        titleColor: isDark ? "#fff" : "#000",
        bodyColor: isDark ? "#ddd" : "#333",
        borderColor: isDark ? "#444" : "#ccc",
        borderWidth: 1,

        callbacks: {

          title: (items: any) => {

            const d = new Date(items[0].parsed.x);

            return d.toLocaleString("hu-HU", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });

          },

          label: (ctx: any) => {

            const ds = ctx.dataset;
            const v = ctx.parsed.y;

            if (ds._isForecast) {
              return `AI előrejelzés · ${ds._aiCategory}: ${v}`;
            }

            return `${ds.label}: ${v}`;

          },

        },

      },

      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: "x",
        },
        pan: { enabled: true, mode: "x" },
      },

    },

  };

  return (
    <div style={{ width: "100%", height }}>
      <Bar key={range + theme} data={{ datasets }} options={options} />
    </div>
  );
}

