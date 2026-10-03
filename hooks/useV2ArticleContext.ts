"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeArticleContextResponse } from "@/lib/v2/article-context-client";
import { isFrontendV2Enabled } from "@/lib/v2/frontend-config";

export type V2ArticleContextState = { status: "disabled" | "idle" | "loading" | "ready" | "empty" | "error"; data: ReturnType<typeof normalizeArticleContextResponse> | null; error: string | null };
export type V2ArticleContextFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function useV2ArticleContext(articleId: number | null, enabled = isFrontendV2Enabled(), fetcher: V2ArticleContextFetcher = fetch): V2ArticleContextState {
  const [state, setState] = useState<V2ArticleContextState>({ status: enabled ? "idle" : "disabled", data: null, error: null });
  const sequence = useRef(0);
  useEffect(() => {
    const current = ++sequence.current;
    if (!enabled || articleId == null || !Number.isSafeInteger(articleId) || articleId < 1) { setState({ status: enabled ? "idle" : "disabled", data: null, error: null }); return undefined; }
    const controller = new AbortController(); setState({ status: "loading", data: null, error: null });
    fetcher(`/api/v2/articles/${articleId}/context`, { cache: "no-store", signal: controller.signal }).then(async (response) => { const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.errors?.[0]?.code || `v2_context_http_${response.status}`); return normalizeArticleContextResponse(payload); }).then((data) => { if (current !== sequence.current) return; const hasContent = Boolean(data.article.summary?.text) || data.timeline.items.length > 0; setState({ status: hasContent ? "ready" : "empty", data, error: null }); }).catch((error: unknown) => { if (controller.signal.aborted || current !== sequence.current) return; setState({ status: "error", data: null, error: error instanceof Error ? error.message : "v2_context_failed" }); });
    return () => { controller.abort(); };
  }, [articleId, enabled, fetcher]);
  return state;
}
