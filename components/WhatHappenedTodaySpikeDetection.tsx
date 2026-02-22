"use client";

import useSWR from "swr";
import { useState } from "react";
import Spinner from "react-bootstrap/Spinner";
import { Badge, Modal, Button } from "react-bootstrap";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type SpikeLevel = "mild" | "strong" | "brutal";
type SpikeType = "category" | "source";

interface SpikeItem {
  type: SpikeType;
  label: string;
  hour: number;
  value: number;
  level: SpikeLevel;
}

export default function WhatHappenedTodaySpikeDetectionV2() {
  const { data, error, isLoading } = useSWR<{ success: boolean; spikes: SpikeItem[] }>(
    "/api/insights/spike-detection",
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  );

  const [open, setOpen] = useState<SpikeItem | null>(null);

  if (isLoading) {
    return (
      <div className="spike-v2-root text-center py-3">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (error || !data || !data.success) {
    return <div className="spike-v2-root text-danger p-3">Nem sikerült betölteni az aktivitásokat.</div>;
  }

  const spikes = Array.isArray(data.spikes) ? data.spikes : [];

  if (!spikes.length) {
    return <div className="spike-v2-root text-muted p-3">Ma nem történt kiugró aktivitás.</div>;
  }

  // Rendezés: legnagyobb érték felül, ha azonos érték akkor későbbi óra felül
  const sorted = [...spikes].sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    return b.hour - a.hour;
  });

  const levelBadge = (level: SpikeLevel) => {
    if (level === "brutal") return <Badge bg="danger" className="spike-v2-badge spike-v2-badge-brutal">BRUTÁL</Badge>;
    if (level === "strong") return <Badge bg="warning" text="dark" className="spike-v2-badge spike-v2-badge-strong">ERŐS</Badge>;
    return <Badge bg="secondary" className="spike-v2-badge spike-v2-badge-mild">ENYHE</Badge>;
  };

  const iconFor = (t: SpikeType) => (t === "category" ? "🔥" : "⚡");

  return (
    <div className="spike-v2-root">
      <h5 className="mb-3 spike-v2-title">Kiugró aktivitások ma</h5>

      <div className="spike-v2-list">
        {sorted.map((s, i) => (
          <div
            key={`${s.type}-${s.label}-${i}`}
            className={`spike-v2-item spike-v2-level-${s.level} d-flex align-items-center justify-content-between`}
            onClick={() => setOpen(s)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter") setOpen(s); }}
          >
            <div className="spike-v2-left d-flex align-items-start">
              <div className="spike-v2-icon me-2">{iconFor(s.type)}</div>
              <div>
                <div className="spike-v2-label"><strong>{s.label}</strong> <span className="spike-v2-type text-muted">({s.type})</span></div>
                <div className="spike-v2-meta text-muted small">{s.hour}:00 • {s.value} cikk</div>
              </div>
            </div>

            <div className="spike-v2-right d-flex align-items-center gap-2">
              <div className="spike-v2-value text-end"><strong>{s.value}</strong></div>
              {levelBadge(s.level)}
            </div>
          </div>
        ))}
      </div>

      <Modal show={!!open} onHide={() => setOpen(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {open?.label} <small className="text-muted"> — {open?.hour}:00</small>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">Típus: <strong>{open?.type}</strong></p>
          <p className="mb-2">Cikkek száma: <strong>{open?.value}</strong></p>
          <p className="mb-2">Spike szint: <strong>{open?.level}</strong></p>
          <p className="text-muted small">Kattints a listában egy elemre, hogy megnyisd a részleteket. Itt később példacikkok vagy filter gombok jeleníthetők meg.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setOpen(null)}>Bezár</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
