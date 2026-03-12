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

/** Parse "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS" into a local Date reliably */
function parseLocalDateString(s: string): Date | null {
  if (!s || typeof s !== "string") return null;
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  const m = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = m[6] ? Number(m[6]) : 0;
  return new Date(year, month - 1, day, hour, minute, second);
}

/** HELYI IDŐ → BUCKET kulcs (YYYY-MM-DD HH:00:00) */
function toLocalBucketKeyFromDate(d: Date) {
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

/** Parse the bucket key back to a Date (local) */
function parseBucketKeyToDate(k: string): Date {
  const m = k.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return new Date(k);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6]);
  return new Date(year, month - 1, day, hour, minute, second);
}

/**
 * Aggregate points array where each item has { date: string | Date, count: number }
 * Returns array of { x: Date, y: number } with local Date objects.
 */
function aggregatePoints(points: any[], range: string) {
  const bucket: Record<string, number> = {};

  points.forEach((p) => {
    if (!p) return;
    let d: Date | null = null;

    if (p.date instanceof Date) {
      d = new Date(p.date.getTime());
    } else if (typeof p.date === "string") {
      d = parseLocalDateString(p.date);
    } else {
      d = p.date ? new Date(p.date) : null;
    }

    if (!d || isNaN(d.getTime())) return;

    if (range === "24h") {
      d.setMinutes(0, 0, 0);
    } else {
      d.setHours(0, 0, 0, 0);
    }

    const key = toLocalBucketKeyFromDate(d);

    const v =
      typeof p.count === "number"
        ? p.count
        : typeof p.y === "number"
        ? p.y
        : Number(p.count ?? p.y) || 0;

    bucket[key] = (bucket[key] || 0) + v;
  });

  const entries = Object.entries(bucket).sort((a, b) => (a[0] < b[0] ? -1 : 1));

  return entries.map(([k, v]) => ({
    x: parseBucketKeyToDate(k),
    y: v,
  }));
}

export default function InsightsOverviewChart({
  data,
  forecast = {},
  height = 300,
  range = "24h",
}: any) {
  // Defensive defaults
  data = Array.isArray(data) ? data : [];
  forecast = forecast && typeof forecast === "object" ? forecast : {};

  const theme = useUserStore((s) => s.theme);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const textColor = isDark ? "#ddd" : "#333";

  const gridColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";

  const { datasets } = useMemo(() => {
    const ds: any[] = [];

    // HISTORY
    (data || []).forEach((cat: any) => {
      const label = cat?.category ?? "Ismeretlen";
      const color = getCategoryColor(label);
      const points = Array.isArray(cat?.points) ? cat.points : [];

      const normalizedHistory = points
        .map((p: any) => {
          let d: Date | null = null;
          if (p?.date instanceof Date) d = new Date(p.date.getTime());
          else if (typeof p?.date === "string") d = parseLocalDateString(p.date);
          if (!d || isNaN(d.getTime())) return null;
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const hour = String(d.getHours()).padStart(2, "0");
          const minute = String(d.getMinutes()).padStart(2, "0");
          const second = String(d.getSeconds()).padStart(2, "0");
          return {
            date: `${year}-${month}-${day} ${hour}:${minute}:${second}`,
            count:
              typeof p.count === "number"
                ? p.count
                : Number(p.count ?? p.y) || 0,
          };
        })
        .filter(Boolean);

      const aggregated = aggregatePoints(normalizedHistory, range);

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
        (k) => k !== "_default"
      );

      Object.entries(forecast).forEach(([catName, fc]: any) => {
        if (!VALID_CATEGORIES.includes(catName)) return;

        const color = getCategoryColor(catName);
        const series = Array.isArray(fc) ? fc : [];

        const normalizedForecast = series
          .map((p: any) => {
            if (!p) return null;
            const parsed =
              typeof p.date === "string"
                ? parseLocalDateString(p.date)
                : p.date instanceof Date
                ? new Date(p.date.getTime())
                : null;
            if (!parsed || isNaN(parsed.getTime())) return null;
            const year = parsed.getFullYear();
            const month = String(parsed.getMonth() + 1).padStart(2, "0");
            const day = String(parsed.getDate()).padStart(2, "0");
            const hour = String(parsed.getHours()).padStart(2, "0");
            const minute = String(parsed.getMinutes()).padStart(2, "0");
            const second = String(parsed.getSeconds()).padStart(2, "0");
            return {
              date: `${year}-${month}-${day} ${hour}:${minute}:${second}`,
              count:
                typeof p.predicted === "number"
                  ? p.predicted
                  : Number(p.predicted) || 0,
            };
          })
          .filter(Boolean);

        const aggregated = aggregatePoints(normalizedForecast, range);

        ds.push({
          label: "AI előrejelzés",
          data: aggregated,
          backgroundColor: color + "66",
          borderColor: color,
          borderWidth: 1,
          borderDash: [6, 6],
          stack: "forecast",
          _isForecast: true,
          _aiCategory: catName,
          barThickness: 18,
          maxBarThickness: 22,
        });
      });

      // DUMMY AI LEGEND
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

  // Debug output (development only)
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.log("DEBUG CHART DATASETS:", datasets);
    datasets.forEach((d: any, i: number) => {
      // eslint-disable-next-line no-console
      console.log(
        `dataset[${i}] label=${d.label} points=`,
        Array.isArray(d.data) ? d.data.slice(0, 8) : d.data
      );
      if (Array.isArray(d.data) && d.data.length > 0) {
        // eslint-disable-next-line no-console
        console.log(
          `  first x type:`,
          typeof d.data[0].x,
          "isDate:",
          d.data[0].x instanceof Date,
          "value:",
          d.data[0].x
        );
      }
    });
  }

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      mode: "nearest",
      intersect: false,
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
          },
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

          if (!ds._isForecast) {
            const visible = chart.isDatasetVisible(idx);
            chart.setDatasetVisibility(idx, !visible);
            chart.update();
            return;
          }

          if (ds._isDummyAiLegend) {
            const anyVisible = chart.data.datasets.some(
              (d: any, i: number) =>
                d._isForecast && !d._isDummyAiLegend && chart.isDatasetVisible(i)
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

  // Guard render: ensure datasets exist and at least one dataset has points
  const hasDatasets = Array.isArray(datasets) && datasets.length > 0;
  const anyPoints =
    hasDatasets && datasets.some((d: any) => Array.isArray(d.data) && d.data.length > 0);

  if (!hasDatasets || !anyPoints) {
    return (
      <div
        style={{
          width: "100%",
          height,
          minHeight: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: textColor,
        }}
      >
        Nincs megjeleníthető adat
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height, minHeight: 200 }}>
      <Bar key={range + theme} data={{ datasets }} options={options} />
    </div>
  );
}
