"use client";

import { useEffect, useState, useMemo } from "react";
import Spinner from "react-bootstrap/Spinner";
import { useUserStore } from "@/store/useUserStore";

/**
 * Diagnostic version: does NOT render ApexChart.
 * It prints safe JSON of data, sorted, series, options to the page and console.
 */

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

/** Safe stringify to avoid crash on circular refs */
function safeStringify(obj: any, space = 2) {
  const seen = new WeakSet();
  return JSON.stringify(
    obj,
    (key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
      }
      if (typeof value === "function") return `[Function ${value.name || "anonymous"}]`;
      return value;
    },
    space
  );
}

export default function WhatHappenedTodaySourceActivityDebug() {
  const [data, setData] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useUserStore((s) => s.theme);
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  console.log("DIAG render start", { theme, isDark, dataLength: data?.length ?? 0, loading });

  useEffect(() => {
    let mounted = true;
    async function load() {
      console.log("DIAG fetch start");
      try {
        const res = await fetch("/api/insights/source-activity");
        const json: ApiResponse = await res.json();
        console.log("DIAG fetch result raw", json);
        if (!mounted) {
          console.log("DIAG fetch ignored (unmounted)");
          return;
        }
        if (json && json.success && Array.isArray(json.sources)) {
          setData(json.sources);
        } else {
          setData([]);
        }
      } catch (err) {
        console.error("DIAG fetch error", err);
        if (mounted) setData([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (!data || data.length === 0) {
    console.log("DIAG: no data to render");
    return <div className="text-muted">Ma még nincs aktivitás.</div>;
  }

  // synchronous safe computations (no useMemo to avoid hook issues)
  let sorted: SourceItem[] = [];
  try {
    sorted = Array.isArray(data) ? [...data].sort((a, b) => (b?.total ?? 0) - (a?.total ?? 0)) : [];
    console.log("DIAG sorted computed length", sorted.length);
  } catch (err) {
    console.error("DIAG sorted sync error", err);
    sorted = [];
  }

  let series: any[] = [];
  try {
    series = sorted.map((item) => ({ name: String(item?.source ?? "unknown"), data: [Number(item?.total ?? 0)] }));
    console.log("DIAG series computed length", series.length, series.slice(0, 5));
  } catch (err) {
    console.error("DIAG series sync error", err);
    series = [];
  }

  let options: any = {};
  try {
    options = {
      chart: { type: "bar", toolbar: { show: false }, stacked: false },
      plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: "60%" } },
      xaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { show: false } },
      colors: ["#FF4D4F", "#FFA940", "#36CFC9", "#40A9FF", "#9254DE", "#73D13D", "#F759AB", "#597EF7", "#FFC53D", "#5CDBD3"],
      dataLabels: {
        enabled: true,
        formatter: (val: any) => `${val} db`,
        style: { fontSize: "14px", fontWeight: 700, colors: isDark ? ["#fff"] : ["#000"] },
        offsetX: 10,
      },
      legend: { show: true, position: "left", horizontalAlign: "left", labels: { colors: isDark ? "#fff" : "#000" } },
      tooltip: { shared: false, theme: isDark ? "dark" : "light", y: { formatter: (v: any) => `${v} db` } },
      grid: { show: false },
    };
    console.log("DIAG options computed");
  } catch (err) {
    console.error("DIAG options error", err);
    options = {};
  }

  const stableKey = `${theme}-${data.length}`;

  // Render debug JSON instead of the chart
  return (
    <div style={{ padding: 12 }}>
      <h5 className="mb-3 text-center">DIAGNOSTIC Források aktivitása ma</h5>

      <div style={{ marginBottom: 12, padding: 12, border: "1px solid #ddd", borderRadius: 8, background: isDark ? "#111" : "#fff", color: isDark ? "#eee" : "#111" }}>
        <strong>stableKey</strong>
        <pre>{stableKey}</pre>
      </div>

      <div style={{ marginBottom: 12, padding: 12, border: "1px dashed #bbb", borderRadius: 8, background: isDark ? "#0b0b0b" : "#fafafa", color: isDark ? "#ddd" : "#222" }}>
        <strong>data (safe)</strong>
        <pre style={{ whiteSpace: "pre-wrap" }}>{safeStringify(data, 2)}</pre>
      </div>

      <div style={{ marginBottom: 12, padding: 12, border: "1px dashed #bbb", borderRadius: 8 }}>
        <strong>sorted (safe)</strong>
        <pre style={{ whiteSpace: "pre-wrap" }}>{safeStringify(sorted, 2)}</pre>
      </div>

      <div style={{ marginBottom: 12, padding: 12, border: "1px dashed #bbb", borderRadius: 8 }}>
        <strong>series (safe)</strong>
        <pre style={{ whiteSpace: "pre-wrap" }}>{safeStringify(series, 2)}</pre>
      </div>

      <div style={{ marginBottom: 12, padding: 12, border: "1px dashed #bbb", borderRadius: 8 }}>
        <strong>options keys</strong>
        <pre>{Object.keys(options || {}).join(", ")}</pre>
      </div>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
        <em>Console logs also printed. If this page renders without crashing, the chart library is likely the cause.</em>
      </div>
    </div>
  );
}
