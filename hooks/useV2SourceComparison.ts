"use client";
import { useEffect, useRef, useState } from "react";
import { normalizeSourceComparisonResponse } from "@/lib/v2/source-comparison-client";
import { isFrontendV2Enabled } from "@/lib/v2/frontend-config";
export type V2SourceComparisonState = { status: "disabled" | "idle" | "loading" | "ready" | "empty" | "error"; data: ReturnType<typeof normalizeSourceComparisonResponse> | null; error: string | null };
export type V2SourceComparisonFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export function useV2SourceComparison(eventId: number | null, enabled = isFrontendV2Enabled(), fetcher: V2SourceComparisonFetcher = fetch): V2SourceComparisonState {
  const [state, setState] = useState<V2SourceComparisonState>({ status: enabled ? "idle" : "disabled", data: null, error: null });
  const sequence = useRef(0);
  useEffect(() => {
    const current = ++sequence.current;
    if (!enabled || eventId == null || !Number.isSafeInteger(eventId) || eventId < 1) { setState({ status: enabled ? "idle" : "disabled", data: null, error: null }); return undefined; }
    const controller = new AbortController(); setState({ status: "loading", data: null, error: null });
    fetcher(`/api/v2/source-comparison?eventId=${eventId}&detail=claims`, { cache: "no-store", signal: controller.signal }).then(async (response) => { const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.errors?.[0]?.code || `v2_source_comparison_http_${response.status}`); return normalizeSourceComparisonResponse(payload); }).then((data) => { if (current !== sequence.current) return; setState({ status: data.sources.length || data.claims.length ? "ready" : "empty", data, error: null }); }).catch((error: unknown) => { if (controller.signal.aborted || current !== sequence.current) return; setState({ status: "error", data: null, error: error instanceof Error ? error.message : "v2_source_comparison_failed" }); });
    return () => controller.abort();
  }, [eventId, enabled, fetcher]);
  return state;
}
