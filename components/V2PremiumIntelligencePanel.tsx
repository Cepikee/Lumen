"use client";
import { useV2PremiumIntelligence, type V2PremiumIntelligenceFetcher } from "@/hooks/useV2PremiumIntelligence";
export default function V2PremiumIntelligencePanel({ eventId, enabled, fetcher }: { eventId: number | null; enabled?: boolean; fetcher?: V2PremiumIntelligenceFetcher }) {
  const state = useV2PremiumIntelligence(eventId, enabled, fetcher);
  if (state.status === "disabled" || state.status === "idle") return null;
  let content = null;
  if (state.status === "loading") content = <p>Prémium elemzés betöltése…</p>;
  else if (state.status === "error" && state.httpStatus === 401) content = <p>A Prémium elemzéshez jelentkezz be.</p>;
  else if (state.status === "error" && state.httpStatus === 403) content = <p>Ez az elemzés Prémium előfizetéssel érhető el.</p>;
  else if (state.status === "error" && state.httpStatus === 404) return null;
  else if (state.status === "error") content = <p>A Prémium elemzés jelenleg nem érhető el.</p>;
  else if (state.status === "empty") content = <p>Nincs elérhető prémium elemzés.</p>;
  else if (state.data) content = <><p>Bizonyíték-alapú eseménykontextus.</p>{state.data.conflicts.length ? <p>Eltérő állítások: {state.data.conflicts.length}</p> : null}{state.data.history.length ? <p>Időbeli előzmények: {state.data.history.length}</p> : null}</>;
  return <section aria-label="Prémium elemzés" className="article-v2-premium-intelligence"><h4>Prémium elemzés</h4>{content}</section>;
}
