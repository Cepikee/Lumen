"use client";
import { useEffect, useRef, useState } from "react";
import { normalizePremiumIntelligenceResponse } from "@/lib/v2/premium-intelligence-client";
import { isFrontendV2Enabled } from "@/lib/v2/frontend-config";
export type V2PremiumIntelligenceState = { status: "disabled" | "idle" | "loading" | "ready" | "empty" | "error"; data: ReturnType<typeof normalizePremiumIntelligenceResponse> | null; error: string | null; httpStatus: number | null };
export type V2PremiumIntelligenceFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export function useV2PremiumIntelligence(eventId: number | null, enabled = isFrontendV2Enabled(), fetcher: V2PremiumIntelligenceFetcher = fetch): V2PremiumIntelligenceState {
  const [state, setState] = useState<V2PremiumIntelligenceState>({ status: enabled ? "idle" : "disabled", data: null, error: null, httpStatus: null });
  const sequence = useRef(0);
  useEffect(() => {
    const current = ++sequence.current;
    if (!enabled || eventId == null || !Number.isSafeInteger(eventId) || eventId < 1) { setState({ status: enabled ? "idle" : "disabled", data: null, error: null, httpStatus: null }); return undefined; }
    const controller = new AbortController(); setState({ status: "loading", data: null, error: null, httpStatus: null });
    fetcher(`/api/v2/premium/intelligence?eventId=${eventId}`, { cache: "no-store", signal: controller.signal }).then(async (response) => { const payload = await response.json().catch(() => null); if (!response.ok) { const error = new Error(payload?.errors?.[0]?.code || `v2_premium_http_${response.status}`) as Error & { status?: number }; error.status = response.status; throw error; } return normalizePremiumIntelligenceResponse(payload); }).then((data) => { if (current !== sequence.current) return; setState({ status: data.status === "ready" ? "ready" : "empty", data, error: null, httpStatus: 200 }); }).catch((error: unknown) => { if (controller.signal.aborted || current !== sequence.current) return; const typed = error as Error & { status?: number }; setState({ status: "error", data: null, error: typed?.message || "v2_premium_failed", httpStatus: typed?.status || null }); });
    return () => controller.abort();
  }, [eventId, enabled, fetcher]);
  return state;
}
