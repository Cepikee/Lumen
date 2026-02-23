"use client";

import useSWR from "swr";
import { useState } from "react";
import Spinner from "react-bootstrap/Spinner";
import { Modal, Button } from "react-bootstrap";

type SpikeLevel = "mild" | "strong" | "brutal";

interface SpikeItem {
  label: string;   // kategória vagy forrás neve
  hour: number;    // óra (0-23)
  value: number;   // cikkek száma
  level?: SpikeLevel; // opcionális, de nem kötelező használni
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
      <div className="spike-grid-root horizontal-list text-center">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (error || !data || !data.success) {
    const msg = (data as any)?.message ?? (data as any)?.error ?? "Nem sikerült betölteni az aktivitásokat.";
    return <div className="spike-grid-root horizontal-list text-danger">Hiba: {msg}</div>;
  }

  const spikes = Array.isArray(data.spikes) ? data.spikes : [];
  if (!spikes.length) {
    return <div className="spike-grid-root horizontal-list text-muted">Ma nem történt kiugró aktivitás.</div>;
  }

  // rendezés: legnagyobb érték elöl
  const sorted = [...spikes].sort((a, b) => {
  if (b.hour !== a.hour) return b.hour - a.hour; // idő szerint visszafelé
  return b.value - a.value; // ha azonos óra, akkor érték szerint
});

  const maxVal = Math.max(...sorted.map((s) => s.value), 1);

  // többféle jelző számítás érték alapján (nem csak a level mezőre támaszkodunk)
  const severity = (v: number) => {
    if (v >= 20) return { key: "extreme", label: "Extrém", cls: "spike-badge-extreme", bar: "spike-card-bar-extreme" };
    if (v >= 15) return { key: "brutal", label: "Brutál", cls: "spike-badge-brutal", bar: "spike-card-bar-brutal" };
    if (v >= 10) return { key: "strong", label: "Erős", cls: "spike-badge-strong", bar: "spike-card-bar-strong" };
    return { key: "mild", label: "Enyhe", cls: "spike-badge-mild", bar: "spike-card-bar-mild" };
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

          return (
            <button
              key={`${s.label}-${i}`}
              className={`spike-card ${sev.key === "extreme" ? "spike-card-extreme" : ""}`}
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
                {/* balra igazított sáv, nincs "100%" felirat */}
                <div
                  className={`spike-card-bar ${sev.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="spike-card-footer">
                <span className={`spike-card-badge ${sev.cls}`}>{sev.label}</span>
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
          <p><strong>Jelző:</strong> {open ? severity(open.value).label : ""}</p>
          <p className="text-muted small">Itt később példacikkok vagy filter gombok jeleníthetők meg.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setOpen(null)}>Bezár</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}