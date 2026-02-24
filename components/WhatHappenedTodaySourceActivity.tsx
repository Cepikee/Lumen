"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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

  const panelRef = useRef<HTMLDivElement | null>(null);
  const [offsetY, setOffsetY] = useState<number>(-4); // alapérték, finomhangoljuk futásidőben

  /* Tooltip dedupe + creation + cleanup */
  useEffect(() => {
    const existing = document.getElementById("custom-apex-tooltip-source");
    if (existing) existing.remove();

    const tip = document.createElement("div");
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

    return () => {
      const t = document.getElementById("custom-apex-tooltip-source");
      if (t) t.remove();
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

  const sorted = [...data.sources].sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  const labels = sorted.map((s) => String(s.source ?? "ismeretlen"));
  const values = sorted.map((s) => Number(s.total ?? 0));

  /* pontos, egységes sormagasság — egyezzen a kulcsszavak moduléval */
  const rowHeight = 36;
  const chartHeight = Math.max(120, sorted.length * rowHeight);

  const baseColors = [
    "#FF4D4F", "#FFA940", "#36CFC9", "#40A9FF", "#9254DE",
    "#73D13D", "#F759AB", "#597EF7", "#FFC53D", "#5CDBD3",
  ];
  const colors = labels.map((_, i) => baseColors[i % baseColors.length]);

  const buildTooltipHtml = (label: string, value: number) =>
    `<div style="font-weight:700;margin-bottom:4px">${label}</div><div style="font-size:12px;opacity:0.85">${value} db</div>`;

  const barHeightPx = Math.max(8, Math.floor(rowHeight * 0.7)); // pl. 36 * 0.7 = 25px

  /* options memoizálva, offsetY dinamikus */
  const options: ApexOptions = useMemo(() => {
    return {
      chart: {
        type: "bar",
        toolbar: { show: false },
        stacked: false,
        sparkline: { enabled: false },
        background: "transparent",
        offsetY,
        parentHeightOffset: 0,
        redrawOnParentResize: true,
        animations: { enabled: false },
        events: {
          mounted(chartContext: any) {
            try {
              const svg = chartContext.el.querySelector("svg");
              const title = svg?.querySelector("title");
              if (title) title.remove();
              if (svg && svg.hasAttribute("title")) svg.removeAttribute("title");
              if (svg && svg.hasAttribute("aria-label")) svg.removeAttribute("aria-label");
            } catch (e) {}
            try {
              // panel cleanup: csak az első canvas maradjon meg
              const panel = chartContext.el.closest(".wht-source-activity");
              if (panel) {
                const canvases = panel.querySelectorAll(".apexcharts-canvas");
                canvases.forEach((c: Element, idx: number) => { if (idx > 0) c.remove(); });
              }
            } catch (e) {}
          },
          updated(chartContext: any) {
            try {
              const panel = chartContext.el.closest(".wht-source-activity");
              if (panel) {
                const canvases = panel.querySelectorAll(".apexcharts-canvas");
                canvases.forEach((c: Element, idx: number) => { if (idx > 0) c.remove(); });
              }
            } catch (e) {}
          },
          dataPointMouseEnter(event: any, chartContext: any, config: any) {
            try {
              const tip = document.getElementById("custom-apex-tooltip-source");
              if (!tip) return;
              const idx = config.dataPointIndex ?? 0;
              tip.innerHTML = buildTooltipHtml(labels[idx], values[idx]);
              const clientX = event?.clientX ?? (config?.event?.clientX ?? 0);
              const clientY = event?.clientY ?? (config?.event?.clientY ?? 0);
              tip.style.display = "block";
              const offsetX = 12, offsetY = 12;
              const vw = window.innerWidth, vh = window.innerHeight;
              const rect = tip.getBoundingClientRect();
              let left = Math.min(vw - rect.width - 8, clientX + offsetX);
              let top = Math.min(vh - rect.height - 8, clientY + offsetY);
              if (left < 8) left = 8;
              if (top < 8) top = 8;
              tip.style.left = `${left}px`;
              tip.style.top = `${top}px`;
            } catch (e) {}
          },
          dataPointMouseLeave() {
            try {
              const tip = document.getElementById("custom-apex-tooltip-source");
              if (tip) tip.style.display = "none";
            } catch (e) {}
          },
          mouseMove(event: any, chartContext: any, config: any) {
            try {
              const tip = document.getElementById("custom-apex-tooltip-source");
              if (!tip || tip.style.display === "none") return;
              const clientX = event?.clientX ?? (config?.event?.clientX ?? 0);
              const clientY = event?.clientY ?? (config?.event?.clientY ?? 0);
              const offsetX = 12, offsetY = 12;
              const vw = window.innerWidth, vh = window.innerHeight;
              const rect = tip.getBoundingClientRect();
              let left = clientX + offsetX;
              let top = clientY + offsetY;
              if (left + rect.width > vw - 8) left = Math.max(8, clientX - rect.width - offsetX);
              if (top + rect.height > vh - 8) top = Math.max(8, clientY - rect.height - offsetY);
              tip.style.left = `${left}px`;
              tip.style.top = `${top}px`;
            } catch (e) {}
          },
        },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: `${barHeightPx}px`,
          distributed: true,
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: any) => `${val} db`,
        style: { fontSize: "13px", fontWeight: 700, colors: isDark ? ["#fff"] : ["#000"] },
        offsetX: 8,
      },
      xaxis: {
        categories: labels,
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { labels: { show: false } },
      grid: { show: false, padding: { left: 0, right: 0, top: 0, bottom: 0 } },
      colors,
      tooltip: { enabled: false },
      legend: { show: false },
    } as ApexOptions;
  }, [labels, values, colors, isDark, offsetY, barHeightPx]);

  /* Automatikus finomhangolás: miután a chart megjelent, mérjük a delta-t és állítsuk be offsetY-t */
  useEffect(() => {
    // futásidőben többször próbálkozunk, mert a chart később renderelhet
    let tries = 0;
    const maxTries = 6;
    const attempt = () => {
      tries++;
      try {
        const panel = panelRef.current;
        if (!panel) {
          if (tries < maxTries) setTimeout(attempt, 120);
          return;
        }
        const legendRow = panel.querySelector('.wht-source-legend > div > div');
        const barPath = panel.querySelector('svg .apexcharts-bar-area');
        if (!legendRow || !barPath) {
          if (tries < maxTries) setTimeout(attempt, 120);
          return;
        }
        const legendRect = (legendRow as HTMLElement).getBoundingClientRect();
        const barRect = (barPath as SVGGraphicsElement).getBoundingClientRect();
        const legendCenterY = legendRect.top + legendRect.height / 2;
        const barCenterY = barRect.top + barRect.height / 2;
        const delta = Math.round(legendCenterY - barCenterY);
        // ha a delta jelentős (>=1), állítsuk be offsetY-t ennek megfelelően
        if (Math.abs(delta - offsetY) > 0) {
          // beállítjuk az offsetY-t úgy, hogy a chart lejjebb/feljebb mozduljon
          setOffsetY((prev) => {
            // limitáljuk ±40px-re, hogy ne legyen túl nagy ugrás
            const newVal = Math.max(-40, Math.min(40, prev + delta));
            return newVal;
          });
        }
      } catch (e) {
        // noop
      } finally {
        if (tries < maxTries) setTimeout(attempt, 160);
      }
    };
    // indítjuk az első próbát
    setTimeout(attempt, 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted.length, chartHeight]); // újramérünk, ha sorok száma változik

  const stableKey = `wht-source-${labels.join("|")}-${isDark ? "dark" : "light"}`;

  return (
    <div className="wht-source-activity" ref={panelRef}>
      <h5 className="mb-3 text-center">Források aktivitása ma</h5>

      <div className="flex items-start gap-3" style={{ alignItems: "flex-start" }}>
        <div style={{ width: 180, flexShrink: 0 }} className="wht-source-legend">
          <div className="flex flex-col">
            {labels.map((label, i) => (
              <div
                key={label}
                style={{
                  height: rowHeight,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  paddingLeft: 6,
                  paddingRight: 6,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: colors[i],
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                <span className="text-sm font-medium truncate" style={{ color: isDark ? "#e6eef8" : "#111827", flex: 1 }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0 wht-source-chart" style={{ overflow: "hidden" }}>
          <ApexChart key={stableKey} options={options} series={[{ name: "Források", data: values }]} type="bar" height={chartHeight} />
        </div>
      </div>
    </div>
  );
}
