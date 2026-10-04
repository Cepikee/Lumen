"use client";
import { useState } from "react";
import { useV2SourceComparison, type V2SourceComparisonFetcher } from "@/hooks/useV2SourceComparison";
type EventOption = { id: number; title: string | null };
export default function V2SourceComparisonPanel({ events, enabled, fetcher, selectedEventId, onEventChange }: { events: EventOption[]; enabled?: boolean; fetcher?: V2SourceComparisonFetcher; selectedEventId?: number | null; onEventChange?: (id: number | null) => void }) {
  const safeEvents = Array.isArray(events) ? events.filter((event) => event && Number.isSafeInteger(event.id) && event.id > 0 && typeof event.title === "string" && event.title.trim()) : [];
  const [localSelected, setLocalSelected] = useState<number | null>(safeEvents.length === 1 ? safeEvents[0].id : null);
  const selected = selectedEventId === undefined ? localSelected : selectedEventId;
  const state = useV2SourceComparison(selected, enabled, fetcher);
  if (state.status === "disabled") return null;
  if (!safeEvents.length) return <section aria-label="Források összehasonlítása" className="article-v2-source-comparison">Nincs összehasonlítható esemény.</section>;
  return <section aria-label="Források összehasonlítása" className="article-v2-source-comparison">
    <h4>Források összehasonlítása</h4>
    {safeEvents.length > 1 ? <label>Esemény<select aria-label="Esemény kiválasztása" value={selected ?? ""} onChange={(event) => { const next = Number(event.target.value) || null; setLocalSelected(next); onEventChange?.(next); }}><option value="">Válassz eseményt</option>{safeEvents.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label> : null}
    {selected == null ? <p>Válassz egy eseményt az összehasonlításhoz.</p> : null}
    {state.status === "loading" ? <p>Az összehasonlítás betöltése…</p> : null}
    {state.status === "error" ? <p>Az összehasonlítás jelenleg nem érhető el.</p> : null}
    {state.status === "empty" ? <p>Nincs összehasonlítható forrásadat.</p> : null}
    {state.status === "ready" && state.data ? <><ul>{state.data.sources.map((source: { id: number | null; name: string; articleCount: number }) => <li key={`${source.id ?? "unknown"}-${source.name}`}>{source.name} · {source.articleCount} cikk</li>)}</ul><ul>{state.data.claims.map((claim: { key: string; predicate: string | null; coverage: string }) => <li key={claim.key}>{claim.predicate || "Állítás"} · {claim.coverage === "shared" ? "Közös állítás" : "Ebben a forrásban szerepel"}</li>)}</ul></> : null}
  </section>;
}
