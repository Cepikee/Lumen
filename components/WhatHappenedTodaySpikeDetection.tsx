"use client";

import useSWR from "swr";
import { useState } from "react";
import Spinner from "react-bootstrap/Spinner";
import { Modal, Button } from "react-bootstrap";

type SpikeLevel = "mild" | "strong" | "brutal";

interface SpikeItem {
  label: string;
  hour: number;
  value: number;
  level: SpikeLevel;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function WhatHappenedTodaySpikeDetection() {
  const { data, error, isLoading } = useSWR<{ success: boolean; spikes: SpikeItem[] }>(
    "/api/insights/spike-detection",
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  );

  const [open, setOpen] = useState<SpikeItem | null>(null);

  if (isLoading) {
    return (
      <div className="spike-grid-root text-center">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (error || !data || !data.success) {
    const msg = (data as any)?.message ?? (data as any)?.error ?? "Nem sikerült betölteni az aktivitásokat.";
    return <div className="spike-grid-root text-danger">Hiba: {msg}</div>;
  }

  const spikes = Array.isArray(data.spikes) ? data.spikes : [];
  if (!spikes.length) {
    return <div className="spike-grid-root text-muted">Ma nem történt kiugró aktivitás.</div>;
  }

  // rendezés: legnagyobb érték elöl
  const sorted = [...spikes].sort((a, b) => b.value - a.value);
  const maxVal = Math.max(...sorted.map((s) => s.value), 1);

  const levelLabel = (l: SpikeLevel) => (l === "brutal" ? "Brutál" : l === "strong" ? "Erős" : "Enyhe");

  return (
    <div className="spike-grid-root">
      <div className="spike-grid-header">
        <h5 className="spike-grid-title">Kiugró aktivitások ma</h5>
        <div className="spike-grid-sub">Legnagyobb aktivitások, óránként</div>
      </div>

      <div className="spike-grid">
        {sorted.map((s, i) => {
          const pct = Math.round((s.value / maxVal) * 100);
          return (
            <button
              key={`${s.label}-${i}`}
              className={`spike-card spike-card-${s.level}`}
              onClick={() => setOpen(s)}
              aria-label={`${s.label} ${s.hour}:00 ${s.value} cikk`}
              type="button"
            >
              <div className="spike-card-top">
                <div className="spike-card-label">{s.label}</div>
                <div className="spike-card-meta">
                  <span className="spike-card-hour">{s.hour}:00</span>
                  <span className="spike-card-value">{s.value}</span>
                </div>
              </div>

              <div className="spike-card-barwrap" aria-hidden>
                <div className="spike-card-bar" style={{ width: `${pct}%` }} />
              </div>

              <div className="spike-card-footer">
                <span className={`spike-card-badge spike-badge-${s.level}`}>{levelLabel(s.level)}</span>
                <small className="spike-card-percent">{pct}%</small>
              </div>
            </button>
          );
        })}
      </div>

      <Modal show={!!open} onHide={() => setOpen(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{open?.label} — {open?.hour}:00</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p><strong>Cikkek száma:</strong> {open?.value}</p>
          <p><strong>Spike szint:</strong> {open ? levelLabel(open.level) : ""}</p>
          <p className="text-muted small">Itt később példacikkok vagy filter gombok jeleníthetők meg.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setOpen(null)}>Bezár</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
