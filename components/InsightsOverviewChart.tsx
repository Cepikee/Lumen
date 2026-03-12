"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useUserStore } from "@/store/useUserStore";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

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
  height = 320,
  range = "24h",
}: any) {

  const theme = useUserStore((s) => s.theme);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const textColor = isDark ? "#ddd" : "#333";
  const gridColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";

  const { series, categories } = useMemo(() => {

    let buckets: string[] = [];

    const now = new Date();

    // ===== TIME BUCKET GENERATION =====

    if (range === "24h") {

      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m++) {
          buckets.push(
            `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
          );
        }
      }

    } else if (range === "7d") {

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        buckets.push(d.toLocaleDateString("hu-HU"));
      }

    } else {

      const days = range === "30d" ? 30 : 90;

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        buckets.push(d.toLocaleDateString("hu-HU"));
      }

    }

    const s: any[] = [];

    (data || []).forEach((cat: any) => {

      const label = cat?.category ?? "Ismeretlen";
      const color = getCategoryColor(label);

      const map: Record<string, number> = {};

      (cat.points || []).forEach((p: any) => {

        const d = new Date(p.date);

        let key = "";

        if (range === "24h") {
          key = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
        } else {
          key = d.toLocaleDateString("hu-HU");
        }

        const val =
          typeof p?.count === "number"
            ? p.count
            : Number(p?.count) || 0;

        map[key] = (map[key] ?? 0) + val;

      });

      const row = buckets.map((b) => map[b] ?? 0);

      s.push({
        name: label,
        data: row,
        color,
      });

    });

    return { series: s, categories: buckets };

  }, [data, range]);

  const options: any = {

    chart: {
      type: "bar",
      stacked: true,
      toolbar: { show: false },
      animations: { enabled: false },
      foreColor: textColor,
    },

    theme: {
      mode: isDark ? "dark" : "light",
    },

    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "80%",
      },
    },

    grid: {
      borderColor: gridColor,
    },

    legend: {
      position: "bottom",
      labels: {
        colors: textColor,
      },
    },

    xaxis: {
      categories,
      labels: {
        style: { colors: textColor },
        show: range !== "24h", // 24h-nál túl sok lenne
      },
    },

    yaxis: {
      labels: {
        show: false, // ⭐ számok eltüntetve
      },
    },

    tooltip: {
      y: {
        formatter: (val: number, opts: any) =>
          `${opts.w.config.series[opts.seriesIndex].name}: ${val} cikk`,
      },
    },

  };

  const stableKey = `${theme}-${range}-${categories.length}`;

  return (
    <div style={{ width: "100%", height }}>
      <ReactApexChart
        key={stableKey}
        options={options}
        series={series}
        type="bar"
        height={height}
      />
    </div>
  );
}