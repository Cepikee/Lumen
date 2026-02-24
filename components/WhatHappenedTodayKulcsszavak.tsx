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

  useEffect(() => {
    // Robust tooltip handler: figyeljük a DOM-ot, ha létrejön .apexcharts-tooltip, áthelyezzük a body-hoz
    let observer: MutationObserver | null = null;
    let currentTip: HTMLElement | null = null;
    let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;

    const ensureTip = (tip: HTMLElement | null) => {
      if (!tip) return;
      // alapstílusok
      tip.style.position = "fixed";
      tip.style.zIndex = "99999";
      tip.style.pointerEvents = "auto";
      tip.style.display = "none";
      tip.style.transform = "none";
      // ha nincs a body-n, áthelyezzük
      if (tip.parentElement !== document.body) {
        document.body.appendChild(tip);
      }
    };

    const attachObserver = () => {
      observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          // új node-ok között keressük a tooltipet
          if (m.addedNodes && m.addedNodes.length) {
            m.addedNodes.forEach((n) => {
              if (!(n instanceof HTMLElement)) return;
              // közvetlen tooltip vagy belső elem
              if (n.classList.contains("apexcharts-tooltip")) {
                currentTip = n;
                ensureTip(currentTip);
              } else {
                const found = n.querySelector?.(".apexcharts-tooltip") as HTMLElement | null;
                if (found) {
                  currentTip = found;
                  ensureTip(currentTip);
                }
              }
            });
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      // ha már van tooltip a DOM-ban, azonnal kezeljük
      const existing = document.querySelector(".apexcharts-tooltip") as HTMLElement | null;
      if (existing) {
        currentTip = existing;
        ensureTip(currentTip);
      }
    };

    const attachMouseMove = () => {
      mouseMoveHandler = (event: MouseEvent) => {
        try {
          const tip = currentTip ?? (document.querySelector(".apexcharts-tooltip") as HTMLElement | null);
          if (!tip) return;
          if (!tip.innerHTML || tip.innerHTML.trim() === "") {
            tip.style.display = "none";
            return;
          }

          const offsetX = 12;
          const offsetY = 12;
          const clientX = event.clientX;
          const clientY = event.clientY;

          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const rect = tip.getBoundingClientRect();
          let left = clientX + offsetX;
          let top = clientY + offsetY;

          if (left + rect.width > vw - 8) {
            left = Math.max(8, clientX - rect.width - offsetX);
          }
          if (top + rect.height > vh - 8) {
            top = Math.max(8, clientY - rect.height - offsetY);
          }

          tip.style.left = `${left}px`;
          tip.style.top = `${top}px`;
          tip.style.display = "block";
        } catch (e) {
          // noop
        }
      };

      window.addEventListener("mousemove", mouseMoveHandler);
    };

    attachObserver();
    attachMouseMove();

    return () => {
      if (observer) observer.disconnect();
      if (mouseMoveHandler) window.removeEventListener("mousemove", mouseMoveHandler);
      // ne töröljük a tooltipet a body-ból, csak hagyjuk a cleanup-ot
      observer = null;
      currentTip = null;
      mouseMoveHandler = null;
    };
  }, []);

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
      // megtartjuk az events-et is, de a MutationObserver a fő megoldás
      events: {
        mounted: function (chartContext: any) {
          try {
            const tip = chartContext.el.querySelector(".apexcharts-tooltip") as HTMLElement | null;
            if (tip) {
              // ha van, áthelyezzük a body-hoz (observer is figyel, de itt is biztosítjuk)
              if (tip.parentElement !== document.body) document.body.appendChild(tip);
              tip.style.position = "fixed";
              tip.style.zIndex = "99999";
              tip.style.pointerEvents = "auto";
              tip.style.display = "none";
              tip.style.transform = "none";
            }
          } catch (e) {}
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
      theme: isDark ? "dark" : "light",
      y: { formatter: (val: any) => `${val} db` },
      shared: false,
      enabled: true,
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
