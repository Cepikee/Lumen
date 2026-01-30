"use client";

import { useEffect, useRef } from "react";

export type InsightSourceRingProps = {
  sources?: {
    name: string;
    percent: number;
    color?: string;
  }[];
  data?: number[];
  size?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
};

export default function InsightSourceRing({
  sources,
  data,
  size = 64,
  className = "",
  "aria-hidden": ariaHidden,
}: InsightSourceRingProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let segments: { percent: number; color: string }[] = [];

    if (Array.isArray(sources) && sources.length > 0) {
      const total = sources.reduce((s, x) => s + (Number(x.percent) || 0), 0) || 100;

      segments = sources.map((s) => ({
        percent: (Number(s.percent) || 0) * (100 / total),
        color: s.color || getColorForName(s.name),
      }));
    } else if (Array.isArray(data) && data.length > 0) {
      const total = data.reduce((s, n) => s + (Number(n) || 0), 0) || 1;

      segments = data.map((n, i) => ({
        percent: (Number(n) || 0) * (100 / total),
        color: defaultPalette[i % defaultPalette.length],
      }));
    } else {
      segments = [{ percent: 100, color: "#3a3f44" }];
    }

    const dpr = window.devicePixelRatio || 1;
    const w = size;
    const h = size;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 2;
    const thickness = Math.max(6, Math.floor(radius * 0.35));
    let start = -Math.PI / 2;

    for (const seg of segments) {
      const angle = (seg.percent / 100) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - thickness / 2, start, start + angle, false);
      ctx.lineWidth = thickness;
      ctx.lineCap = "butt";
      ctx.strokeStyle = seg.color;
      ctx.stroke();
      start += angle;
    }

    ctx.beginPath();
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.arc(cx, cy, radius - thickness - 1, 0, Math.PI * 2);
    ctx.fill();
  }, [sources, data, size]);

  return (
    <div
      className={`insight-source-ring ${className}`}
      style={{ width: size, height: size }}
      aria-hidden={ariaHidden ?? true}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}

/* --- UTOM PORTÁL SZÍNMAP --- */
const sourceColorMap: Record<string, string> = {
  "444": "#2d6126",
  "index": "rgba(224, 226, 116, 0.747)",
  "portfolio": "#ff6600",
  "24hu": "#ff0000",
  "telex": "#00AEEF",
  "hvg": "#ff7a00",
};

function normalizeName(name?: string) {
  if (!name) return "";
  return name.toLowerCase().replace(".hu", "").trim();
}

function getColorForName(name?: string) {
  const key = normalizeName(name);
  return sourceColorMap[key] || "#4da3ff";
}

const defaultPalette = ["#ff6b6b", "#4dabf7", "#9b5de5", "#ffd166", "#06d6a0"];
