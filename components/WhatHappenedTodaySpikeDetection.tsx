"use client";

import useSWR from "swr";
import { useState } from "react";
import Spinner from "react-bootstrap/Spinner";
import { Modal, Button } from "react-bootstrap";
import { useUserStore } from "@/store/useUserStore";

type SpikeLevel = "mild" | "strong" | "brutal";

interface SpikeItem {
  label: string;
  hour: number;
  value: number;
  level?: SpikeLevel;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// --- KATEGÓRIA SZÍNEK ---
const categoryColors: Record<string, string> = {
  Politika: "#d81b60",
  Gazdaság: "#f9a825",
  Közélet: "#43a047",
  Kultúra: "#00acc1",
  Egészségügy: "#e53935",
  Oktatás: "#3949ab",
};

// --- FORRÁS SZÍNEK ---
const sourceColors: Record<string, string> = {
  "origo.hu": "#FF4D4F",
  "portfolio.hu": "#FFA940",
  "index.hu": "#36CFC9",
  "24.hu": "#40A9FF",
  "hvg.hu": "#9254DE",
  "telex.hu": "#73D13D",
  "444.hu": "#F759AB",
};

// --- SZÍN KIVÁLASZTÁSA ---
const getColorForLabel = (label: string) => {
  if (categoryColors[label]) return categoryColors[label];
  if (sourceColors[label]) return sourceColors[label];
  return "#999";
};

// --- SEVERITY SZÍNEK ---
const severityColors: Record<string, string> = {
  extreme: "#d32f2f",
  brutal: "#ec407a",
  strong: "#43a047",
  mild: "#ffa726",
};

export default function WhatHappenedTodaySpikeDetection() {
  const theme = useUserStore((s) => s.theme);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR<{ success: boolean; spikes: SpikeItem[] }>(
    "/api/insights/spike-detection",
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  );

  const [open, setOpen] = useState<SpikeItem | null>(null);

  if (isLoading) {
    return (
      <div className="spike-grid-root horizontal-list text-center">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (error || !data || !data.success) {
    const msg =
      (data as any)?.message ??
      (data as any)?.error ??
      "Nem sikerült betölteni az aktivitásokat.";
    return <div className="spike-grid-root horizontal-list text-danger">Hiba: {msg}</div>;
  }

  const spikes = Array.isArray(data.spikes) ? data.spikes : [];
  if (!spikes.length) {
    return (
      <div className="spike-grid-root horizontal-list text-muted">
        Ma nem történt kiugró aktivitás.
      </div>
    );
  }

  // --- RENDEZÉS: idő szerint visszafelé ---
  const sorted = [...spikes].sort((a, b) => {
    if (b.hour !== a.hour) return b.hour - a.hour;
    return b.value - a.value;
  });

  const maxVal = Math.max(...sorted.map((s) => s.value), 1);

  // --- JELZŐK ---
  const severity = (v: number) => {
    if (v >= 20) return { key: "extreme", label: "Extrém" };
    if (v >= 15) return { key: "brutal", label: "Brutál" };
    if (v >= 10) return { key: "strong", label: "Erős" };
    return { key: "mild", label: "Enyhe" };
  };

  return (
    <div className="spike-grid-root horizontal-list" role="region" aria-label="Kiugró aktivitások ma">
      <div className="spike-grid-header">
        <h5 className="spike-grid-title">Kiugró aktivitások ma</h5>
      </div>

      <div className="spike-grid">
        {sorted.map((s, i) => {
          const pct = Math.round((s.value / maxVal) * 100);
          const sev = severity(s.value);

          const color = getColorForLabel(s.label);
          const sevColor = severityColors[sev.key];

          return (
            <button
              key={`${s.label}-${i}`}
              className="spike-card"
              onClick={() => setOpen(s)}
              aria-label={`${s.label} ${s.hour}:00 ${s.value} cikk`}
              type="button"
            >
              <div className="spike-card-top">

                {/* --- CÍM: mindig színes, dark módban is --- */}
                <div
                  className="spike-card-label"
                  style={{ color: color }}
                >
                  {s.label}
                </div>

                <div className="spike-card-meta">

                  {/* --- ÓRA: dark módban fehér --- */}
                  <span
                    className="spike-card-hour"
                    style={{ color: isDark ? "#fff" : "#000" }}
                  >
                    {s.hour}:00
                  </span>

                  {/* --- ÉRTÉK: dark módban fehér --- */}
                  <span
                    className="spike-card-value"
                    style={{ color: isDark ? "#fff" : "#000" }}
                  >
                    {s.value}
                  </span>
                </div>
              </div>

              <div className="spike-card-barwrap" aria-hidden>
                <div
                  className="spike-card-bar"
                  style={{
                    width: `${pct}%`,
                    background: color,
                  }}
                />
              </div>

              <div className="spike-card-footer">
                <span
                  className="spike-card-badge"
                  style={{ background: sevColor }}
                >
                  {sev.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <Modal show={!!open} onHide={() => setOpen(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {open?.label} — {open?.hour}:00
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p><strong>Cikkek száma:</strong> {open?.value}</p>
          <p><strong>Jelző:</strong> {open ? severity(open.value).label : ""}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setOpen(null)}>Bezár</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
