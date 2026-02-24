"use client";

import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import Spinner from "react-bootstrap/Spinner";
import { useUserStore } from "@/store/useUserStore";
import type { ApexOptions } from "apexcharts";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface SourceItem {
  source: string;
  total: number;
  hours: number[];
}

interface ApiResponse {
  success: boolean;
  sources: SourceItem[];
  [k: string]: any;
}

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

export default function WhatHappenedTodaySourceActivity() {
  const theme = useUserStore((s) => s.theme);
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR<ApiResponse>("/api/insights/source-activity", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });

  /* --- CUSTOM TOOLTIP SETUP (single DOM element on body) --- */
  useEffect(() => {
    let tip = document.getElementById("custom-apex-tooltip-source");
    if (!tip) {
      tip = document.createElement("div");
      tip.id = "custom-apex-tooltip-source";
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
      tip.style.background = isDark ? "#0b1220" : "#ffffff";
      tip.style.color = isDark ? "#fff" : "#000";
    }

    return () => {
      // keep tooltip element for reuse; no removal to avoid flicker on remount
    };
  }, [isDark]);

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (error || !data || !data.success || !Array.isArray(data.sources) || data.sources.length === 0) {
    return <div className="text-muted">Ma még nincs aktivitás.</div>;
  }

  // rendezés: legnagyobb elöl
  const sorted = [...data.sources].sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  const labels = sorted.map((s) => String(s.source ?? "ismeretlen"));
  const values = sorted.map((s) => Number(s.total ?? 0));

  // Sor magasság és chart magasság (összhangban a kulcsszavak komponenssel)
  const rowHeight = 48;
  const chartHeight = Math.max(120, sorted.length * rowHeight);

  const baseColors = [
    "#FF4D4F",
    "#FFA940",
    "#36CFC9",
    "#40A9FF",
    "#9254DE",
    "#73D13D",
    "#F759AB",
    "#597EF7",
    "#FFC53D",
    "#5CDBD3",
  ];
  // ha szeretnéd, hogy minden sáv más színű legyen:
  const distributedColors = labels.map((_, i) => baseColors[i % baseColors.length]);

  const buildTooltipHtml = (label: string, value: number) => {
    return `<div style="font-weight:700;margin-bottom:4px">${label}</div><div style="font-size:12px;opacity:0.85">${value} db</div>`;
  };

  /* ===== Fontos változtatás: single series + xaxis.categories =====
     így könnyen megjeleníthetjük a bal oldali címkéket és a chartot egymás mellett
  */
  const options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      stacked: false,
      sparkline: { enabled: true },
      background: "transparent",
      offsetY: -4,
      events: {
        mounted: function (chartContext: any) {
          try {
            // eltávolítjuk az SVG <title>-t és aria attribútumokat (megelőzi a natív "Chart" tooltipet)
            const svg = chartContext.el.querySelector("svg");
            const title = svg?.querySelector("title");
            if (title) title.remove();
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
        // custom tooltip events: használjuk dataPointMouseEnter/Leave + mouseMove
        dataPointMouseEnter: function (event: any, chartContext: any, config: any) {
          try {
            const tip = document.getElementById("custom-apex-tooltip-source");
            if (!tip) return;
            // dataPointIndex adja meg a sor indexét (mivel single series)
            const idx = config.dataPointIndex ?? 0;
            const label = labels[idx] ?? "";
            const value = values[idx] ?? 0;
            tip.innerHTML = buildTooltipHtml(label, value);

            const clientX = event?.clientX ?? (config?.event?.clientX ?? 0);
            const clientY = event?.clientY ?? (config?.event?.clientY ?? 0);
            const offsetX = 12;
            const offsetY = 12;
            tip.style.display = "block";
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
            const tip = document.getElementById("custom-apex-tooltip-source");
            if (tip) tip.style.display = "none";
          } catch (e) {}
        },
        mouseMove: function (event: any, chartContext: any, config: any) {
          try {
            const tip = document.getElementById("custom-apex-tooltip-source");
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
        // barHeight pixelben: igazítsd a rowHeight-hoz
        barHeight: `${Math.max(8, Math.floor(rowHeight * 0.6))}px`,
        distributed: false,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: any) => `${val} db`,
      style: {
        fontSize: "13px",
        fontWeight: 700,
        colors: isDark ? ["#fff"] : ["#000"],
      },
      offsetX: 8,
    },
    xaxis: {
      categories: labels,
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { show: false },
    },
    colors: distributedColors,
    tooltip: {
      enabled: false, // built-in tooltip kikapcsolva
    },
    grid: { show: false, padding: { left: 0, right: 0 } },
    legend: { show: false },
  } as ApexOptions;

  const stableKey = `${theme}-${sorted.length}-${values.join(",")}`;

  return (
    <div className="wht-source-activity">
      <h5 className="mb-3 text-center">Források aktivitása ma</h5>

      {/* LAYOUT: bal oldalon a címkék, jobb oldalon a chart — így mindig egymás mellett lesznek */}
      <div className="flex items-start gap-3">
        {/* BAL: címkék (fix szélesség, soronként egyező magasság) */}
        <div style={{ width: 140 }} className="flex-shrink-0">
          <div className="flex flex-col">
            {labels.map((label, i) => (
              <div
                key={i}
                className="source-label"
                style={{
                  height: rowHeight,
                  lineHeight: `${rowHeight}px`,
                  paddingLeft: 6,
                  paddingRight: 6,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                <span
                  className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate"
                  style={{ display: "inline-block", transform: "translateY(-2px)" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* JOBB: chart */}
        <div className="flex-1 min-w-0">
          <ApexChart key={stableKey} options={options} series={[{ name: "Források", data: values }]} type="bar" height={chartHeight} />
        </div>
      </div>
    </div>
  );
}
