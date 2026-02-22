"use client";

import useSWR from "swr";
import { useState, useRef, useEffect } from "react";
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
    "/api/insights/spike-detection",
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  );

  const [open, setOpen] = useState<SpikeItem | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to left (newest) when data arrives
  useEffect(() => {
    if (!stripRef.current) return;
    // small timeout to allow rendering
    const t = setTimeout(() => {
      stripRef.current!.scrollLeft = 0;
    }, 50);
    return () => clearTimeout(t);
  }, [data]);

  if (isLoading) {
    return (
      <div className="spike-v2-root text-center" style={{ padding: 10 }}>
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (error || !data || !data.success) {
    const msg = (data as any)?.message ?? (data as any)?.error ?? "Nem sikerült betölteni az aktivitásokat.";
    return (
      <div className="spike-v2-root text-danger" style={{ padding: 10 }}>
        Hiba: {msg}
      </div>
    );
  }

  const spikes = Array.isArray(data.spikes) ? data.spikes : [];
  if (!spikes.length) {
    return (
      <div className="spike-v2-root text-muted" style={{ padding: 10 }}>
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
    <div className="spike-v2-root" style={{ padding: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="spike-v2-title">Kiugró aktivitások ma</div>
      </div>

      <div className="spike-v2-list" ref={stripRef} role="list" aria-label="Kiugró aktivitások">
        {sorted.map((s, i) => (
          <button
            key={`${s.label}-${i}`}
            className={`spike-v2-item spike-v2-level-${s.level}`}
            onClick={() => setOpen(s)}
            aria-label={`${s.label}, ${s.value} cikk, ${levelLabel(s.level)}`}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div className="spike-v2-label">{s.label}</div>
                <div className="spike-v2-meta">{s.hour}:00</div>
              </div>

              <div className="spike-v2-right">
                <div className="spike-v2-value">{s.value}</div>
                <div className={`spike-v2-badge spike-v2-badge-${s.level}`}>{levelLabel(s.level)}</div>
              </div>
            </div>

            <div className="spike-v2-barwrap" aria-hidden>
              <div className="spike-v2-bar" style={{ width: `${Math.round((s.value / maxVal) * 100)}%` }} />
            </div>
          </button>
        ))}
      </div>

      <button className="spike-v2-nav left" onClick={() => scrollBy(-160)} aria-hidden>‹</button>
      <button className="spike-v2-nav right" onClick={() => scrollBy(160)} aria-hidden>›</button>

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
