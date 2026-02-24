"use client";

import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import Spinner from "react-bootstrap/Spinner";
import { useUserStore } from "@/store/useUserStore";
import type { ApexOptions } from "apexcharts";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface KeywordItem {
  keyword: string;
  count: number;
  level: "mild" | "strong" | "brutal" | null;
}

interface ApiResponse {
  success: boolean;
  keywords: KeywordItem[];
}

const fetcher = (url: string) =>
  fetch(url, {
    headers: { "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY! },
  }).then((r) => r.json());

export default function WhatHappenedTodayKulcsszavak() {
  const theme = useUserStore((s) => s.theme);
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR<ApiResponse>(
    "/api/insights/trending-keywords",
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  );

  /* --- CUSTOM TOOLTIP SETUP (single DOM element on body) --- */
  useEffect(() => {
    let tip = document.getElementById("custom-apex-tooltip");
    if (!tip) {
      tip = document.createElement("div");
      tip.id = "custom-apex-tooltip";
      Object.assign(tip.style, {
        position: "fixed",
        zIndex: "999999",
        pointerEvents: "none",
        display: "none",
        background: isDark ? "#0b1220" : "#ffffff",
        color: isDark ? "#fff" : "#000",
        borderRadius: "6px",
        padding: "8px 10px",
        boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
        fontSize: "13px",
        lineHeight: "1.2",
        maxWidth: "320px",
      });
      document.body.appendChild(tip);
    } else {
      // update theme colors if element already exists
      tip.style.background = isDark ? "#0b1220" : "#ffffff";
      tip.style.color = isDark ? "#fff" : "#000";
    }

    return () => {
      // keep tooltip element for reuse; no removal to avoid flicker on remount
    };
  }, [isDark]);

  if (isLoading) {
    return (
      <div className="text-center py-2 text-gray-500">
        <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
        <span className="ml-2 text-sm">Betöltés...</span>
      </div>
    );
  }

  if (error || !data || !data.success || !Array.isArray(data.keywords) || data.keywords.length === 0) {
    return <div className="text-sm text-gray-500">Ma még nincsenek felkapott kulcsszavak.</div>;
  }

  const sorted = [...data.keywords].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  const counts = sorted.map((k) => Number(k.count ?? 0));
  const categories = sorted.map((k) => String(k.keyword));

  const rowHeight = 36;
  const height = Math.max(120, sorted.length * rowHeight);

  const baseColors = [
    "#FF4D4F", "#FFA940", "#36CFC9", "#40A9FF", "#9254DE",
    "#73D13D", "#F759AB", "#597EF7", "#FFC53D", "#5CDBD3",
  ];
  const colors = sorted.map((_, i) => baseColors[i % baseColors.length]);

  /* Helper to build tooltip HTML */
  const buildTooltipHtml = (label: string, value: number) => {
    return `<div style="font-weight:700;margin-bottom:4px">${label}</div><div style="font-size:12px;opacity:0.85">${value} db</div>`;
  };

  /* Apex options with events:
     - disable built-in tooltip
     - use dataPointMouseEnter/Leave + mouseMove to control custom tooltip
     - remove any <title> elements inserted into the SVG (the "Chart" label)
  */
  const options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      sparkline: { enabled: true },
      animations: {
        enabled: true,
        speed: 450,
        animateGradually: { enabled: true, delay: 40 },
        dynamicAnimation: { enabled: true, speed: 300 },
      },
      background: "transparent",
      offsetY: -4,
      events: {
        mounted: function (chartContext: any) {
          try {
            // Remove any <title> inside the chart SVG (prevents browser native tooltip "Chart")
            const svg = chartContext.el.querySelector("svg");
            const title = svg?.querySelector("title");
            if (title) title.remove();

            // Also remove any aria-label/title attributes that might trigger native tooltips
            if (svg && svg.hasAttribute("title")) svg.removeAttribute("title");
            if (svg && svg.hasAttribute("aria-label")) svg.removeAttribute("aria-label");
          } catch (e) {
            // noop
          }
        },
        updated: function (chartContext: any) {
          try {
            const svg = chartContext.el.querySelector("svg");
            const title = svg?.querySelector("title");
            if (title) title.remove();
            if (svg && svg.hasAttribute("title")) svg.removeAttribute("title");
            if (svg && svg.hasAttribute("aria-label")) svg.removeAttribute("aria-label");
          } catch (e) {
            // noop
          }
        },
        // Show custom tooltip on data point enter
        dataPointMouseEnter: function (event: any, chartContext: any, config: any) {
          try {
            const tip = document.getElementById("custom-apex-tooltip");
            if (!tip) return;
            const dataPointIndex = config.dataPointIndex;
            const label = categories[dataPointIndex] ?? "";
            const value = counts[dataPointIndex] ?? 0;
            tip.innerHTML = buildTooltipHtml(label, value);

            const clientX = event?.clientX ?? (config?.event?.clientX ?? 0);
            const clientY = event?.clientY ?? (config?.event?.clientY ?? 0);
            const offsetX = 12;
            const offsetY = 12;
            tip.style.display = "block";
            // initial placement with viewport bounds check
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const rect = tip.getBoundingClientRect();
            let left = Math.min(vw - rect.width - 8, clientX + offsetX);
            let top = Math.min(vh - rect.height - 8, clientY + offsetY);
            if (left < 8) left = 8;
            if (top < 8) top = 8;
            tip.style.left = `${left}px`;
            tip.style.top = `${top}px`;
          } catch (e) {
            // noop
          }
        },
        dataPointMouseLeave: function () {
          try {
            const tip = document.getElementById("custom-apex-tooltip");
            if (tip) tip.style.display = "none";
          } catch (e) {}
        },
        mouseMove: function (event: any, chartContext: any, config: any) {
          try {
            const tip = document.getElementById("custom-apex-tooltip");
            if (!tip || tip.style.display === "none") return;
            const clientX = event?.clientX ?? (config?.event?.clientX ?? 0);
            const clientY = event?.clientY ?? (config?.event?.clientY ?? 0);
            const offsetX = 12;
            const offsetY = 12;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const rect = tip.getBoundingClientRect();
            let left = clientX + offsetX;
            let top = clientY + offsetY;
            if (left + rect.width > vw - 8) left = Math.max(8, clientX - rect.width - offsetX);
            if (top + rect.height > vh - 8) top = Math.max(8, clientY - rect.height - offsetY);
            tip.style.left = `${left}px`;
            tip.style.top = `${top}px`;
          } catch (e) {
            // noop
          }
        },
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 6,
        barHeight: `${Math.max(8, Math.floor(rowHeight * 0.55))}px`,
        distributed: true,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: any) => `${val} db`,
      style: {
        fontSize: "11px",
        fontWeight: 700,
        colors: isDark ? ["#fff"] : ["#000"],
      },
      offsetX: 6,
    },
    xaxis: {
      categories,
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { show: false } },
    colors,
    tooltip: {
      enabled: false, // built-in tooltip disabled — we use custom tooltip
    },
    grid: { show: false, padding: { left: 0, right: 0 } },
    legend: { show: false },
  };

  const stableKey = `${theme}-${sorted.length}-${counts.join(",")}`;

  return (
    <div className="wht-keywords-activity bg-white/80 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-2 max-w-full">
      <h5 className="text-sm font-medium mb-1 text-left text-gray-900 dark:text-gray-100">
        Felkapott kulcsszavak ma
      </h5>

      <div className="wht-keywords-scroll" style={{ maxHeight: 320, overflowY: "auto" }}>
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0" style={{ width: 140 }}>
            <div className="flex flex-col">
              {sorted.map((item, i) => (
                <div
                  key={i}
                  className="kw-label"
                  style={{
                    height: rowHeight,
                    lineHeight: `${rowHeight}px`,
                    paddingLeft: 6,
                    paddingRight: 6,
                    overflow: "hidden",
                  }}
                >
                  <span
                    className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate"
                    style={{ display: "inline-block", transform: "translateY(-2px)" }}
                  >
                    {item.keyword}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <ApexChart
              key={stableKey}
              options={options}
              series={[{ name: "Említések", data: counts }]}
              type="bar"
              height={height}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
