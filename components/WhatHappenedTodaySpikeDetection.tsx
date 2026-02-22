"use client";

import useSWR from "swr";
import { useState, useRef } from "react";
import Spinner from "react-bootstrap/Spinner";
import { Badge, Modal, Button } from "react-bootstrap";

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
    "/api/insights/spike-detection", // ha szükséges, cseréld resilient fetcherre
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  );

  const [open, setOpen] = useState<SpikeItem | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);

  if (isLoading) {
    return (
      <div className="spike-strip-root text-center py-2" style={{ width: 200, height: 200 }}>
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (error || !data || !data.success) {
    const msg = (data as any)?.message ?? (data as any)?.error ?? "Nem sikerült betölteni az aktivitásokat.";
    return (
      <div className="spike-strip-root text-danger p-2" style={{ width: 200, height: 200 }}>
        Hiba: {msg}
      </div>
    );
  }

  const spikes = Array.isArray(data.spikes) ? data.spikes : [];
  if (!spikes.length) {
    return (
      <div className="spike-strip-root text-muted p-2" style={{ width: 200, height: 200 }}>
        Ma nem történt kiugró aktivitás.
      </div>
    );
  }

  // legfrissebb balra (nagyobb hour balra)
  const sorted = [...spikes].sort((a, b) => b.hour - a.hour);
  const maxVal = Math.max(...sorted.map((s) => s.value), 1);

  const levelLabel = (l: SpikeLevel) => (l === "brutal" ? "BRUTÁL" : l === "strong" ? "ERŐS" : "ENYHE");

  const scrollBy = (delta: number) => {
    if (!stripRef.current) return;
    stripRef.current.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className="spike-strip-root" style={{ width: 200, height: 200, position: "relative", padding: 8 }}>
      <h6 className="spike-strip-title" style={{ margin: 0, fontSize: 12 }}>Kiugró aktivitások ma</h6>

      <div className="spike-strip-viewport" style={{ width: "100%", height: "calc(100% - 36px)", overflowX: "auto", overflowY: "hidden" }}>
        <div className="spike-strip" ref={stripRef} style={{ display: "flex", gap: 8, alignItems: "stretch", paddingBottom: 6 }}>
          {sorted.map((s, i) => (
            <button
              key={`${s.label}-${i}`}
              className={`spike-strip-card spike-strip-level-${s.level}`}
              onClick={() => setOpen(s)}
              aria-label={`${s.label}, ${s.value} cikk, ${levelLabel(s.level)}`}
              style={{
                flex: "0 0 160px",
                height: 140,
                background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02))",
                borderRadius: 8,
                border: "1px solid rgba(0,0,0,0.06)",
                padding: 8,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                textAlign: "left",
                cursor: "pointer",
                color: "inherit",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.1, maxWidth: 100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 11, padding: "4px 6px", borderRadius: 6, fontWeight: 700 }}>
                  {levelLabel(s.level)}
                </div>
              </div>

              <div style={{ height: 44, display: "flex", alignItems: "center", background: "rgba(0,0,0,0.02)", borderRadius: 6, padding: 6, margin: "6px 0" }}>
                <div style={{ height: 12, borderRadius: 6, background: "linear-gradient(90deg,#ff7a00,#ef4444)", width: `${Math.round((s.value / maxVal) * 100)}%`, transition: "width 0.25s ease" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "rgba(0,0,0,0.6)" }}>
                <div>{s.hour}:00</div>
                <div style={{ fontWeight: 700 }}>{s.value} db</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => scrollBy(-160)} style={{ position: "absolute", top: 36, left: 6, width: 28, height: 28, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.06)", cursor: "pointer" }}>‹</button>
      <button onClick={() => scrollBy(160)} style={{ position: "absolute", top: 36, right: 6, width: 28, height: 28, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.06)", cursor: "pointer" }}>›</button>

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
