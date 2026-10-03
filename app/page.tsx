"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import FeedList from "@/components/FeedList";
import type { FeedItem } from "@/components/FeedItemCard";
import { useUserStore } from "@/store/useUserStore";

function normalizeFeedItems(raw: unknown): FeedItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => {
      if (!item || typeof item !== "object") return false;
      const id = Number((item as Record<string, unknown>).id);
      return Number.isSafeInteger(id) && id > 0;
    })
    .map((item) => ({
      ...item,
      id: Number(item.id),
      ai_clean: Number.isFinite(Number(item.ai_clean)) ? Number(item.ai_clean) : 0,
    })) as FeedItem[];
}

export default function Page() {
  const router = useRouter();

  // ⭐ Zustand state-ek
  const viewMode = useUserStore((s) => s.viewMode);
  const isTodayMode = useUserStore((s) => s.isTodayMode);
  const sourceFilters = useUserStore((s) => s.sourceFilters);
  const categoryFilters = useUserStore((s) => s.categoryFilters);
  const searchTerm = useUserStore((s) => s.searchTerm);

  // ⭐ Debounce-olt kereső
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 250); // 250ms debounce

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // ⭐ Feed state
  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [sourcePage, setSourcePage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const feedRequestRef = useRef(0);
  // When a search/filter changes while a later page is visible, the reset
  // effect and the pagination effect run in the same commit. Keep the
  // pagination effect from issuing a request for the pre-reset page.
  const resetFeedKeyRef = useRef<string | null>(null);

  const loaderRef = useRef<HTMLDivElement | null>(null);

  // Normalizált dependency stringek
  const depSources = JSON.stringify(sourceFilters ?? []);
  const depCategories = JSON.stringify(categoryFilters ?? []);
  const depSearch = debouncedSearch ?? "";
  const feedQueryKey = `${depSearch}|${depSources}|${depCategories}|${isTodayMode}`;

  // --- Szűrt fetch ---
  async function fetchFilteredPage(
    pageNum: number,
    sources: string[],
    categories: string[],
    requestId?: number
  ): Promise<FeedItem[] | null> {
    setLoading(true);
    const sourceQuery = sources.map((s) => `source=${encodeURIComponent(s)}`).join("&");
    const categoryQuery = categories.map((c) => `category=${encodeURIComponent(c)}`).join("&");
    const query = [sourceQuery, categoryQuery].filter(Boolean).join("&");

    try {
      const res = await fetch(
        `/api/summaries?page=${pageNum}&limit=10&${query}&q=${encodeURIComponent(debouncedSearch)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`summaries_http_${res.status}`);
      const raw = await res.json();
      if (!Array.isArray(raw)) throw new Error("summaries_invalid_response");
      return normalizeFeedItems(raw);
    } catch {
      if (requestId === undefined || requestId === feedRequestRef.current) {
        setError("A szűrt hírek nem tölthetők be.");
      }
      return null;
    } finally {
      if (requestId === undefined || requestId === feedRequestRef.current) {
        setLoading(false);
      }
    }
  }

  // --- Normál fetch ---
  async function fetchPageData(pageNum: number, requestId?: number): Promise<FeedItem[] | null> {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/summaries?page=${pageNum}&limit=10&q=${encodeURIComponent(debouncedSearch)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`summaries_http_${res.status}`);
      const raw = await res.json();
      if (!Array.isArray(raw)) throw new Error("summaries_invalid_response");
      return normalizeFeedItems(raw);
    } catch {
      if (requestId === undefined || requestId === feedRequestRef.current) {
        setError("A hírek nem tölthetők be.");
      }
      return null;
    } finally {
      if (requestId === undefined || requestId === feedRequestRef.current) {
        setLoading(false);
      }
    }
  }

  // --- Today mód ---
  async function loadToday(isCancelled: () => boolean = () => false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/summaries?today=true&q=${encodeURIComponent(debouncedSearch)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`today_http_${res.status}`);
      const raw = await res.json();
      if (!Array.isArray(raw)) throw new Error("today_invalid_response");
      if (isCancelled()) return;
      if (!Array.isArray(raw)) {
        setItems([]);
        setHasMore(false);
        return;
      }
      const data = normalizeFeedItems(raw);
      if (isCancelled()) return;
      setItems(data);
      setHasMore(false);
    } catch {
      if (!isCancelled()) {
        setItems([]);
        setHasMore(false);
        setError("A mai hírek nem tölthetők be.");
      }
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }

  async function loadFilteredFirstPage() {
    const firstPage = await fetchFilteredPage(1, sourceFilters, categoryFilters);
    if (firstPage === null) return;
    if (firstPage.length === 0) {
      setItems([]);
      setHasMore(false);
      return;
    }
    setItems(firstPage);
    setHasMore(firstPage.length === 10);
    setSourcePage(1);
  }

  // --- FŐ USEEFFECT ---
  useEffect(() => {
    let cancelled = false;
    const requestId = ++feedRequestRef.current;
    resetFeedKeyRef.current = feedQueryKey;

    (async () => {
      setError(null);
      setItems([]);
      setPage(1);
      setSourcePage(1);
      setHasMore(true);

      const hasFilters = sourceFilters.length > 0 || categoryFilters.length > 0;

      // 1) TODAY mód (kereséssel együtt)
      if (isTodayMode) {
        await loadToday(() => cancelled);
        return;
      }

      // 2) FILTER + (SEARCH optional)
      if (hasFilters) {
        const firstPage = await fetchFilteredPage(1, sourceFilters, categoryFilters, requestId);
        if (cancelled) return;

        if (firstPage === null) return;
        if (firstPage.length === 0) {
          setItems([]);
          setHasMore(false);
          return;
        }

        setItems(firstPage);
        setHasMore(firstPage.length === 10);
        return;
      }

      // 3) NINCS FILTER → normál fetch
      const first = await fetchPageData(1, requestId);
      if (cancelled) return;

      if (first === null) return;
      if (first.length === 0) {
        setItems([]);
        setHasMore(false);
        return;
      }

      setItems(first);
      setHasMore(first.length === 10);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isTodayMode,
    depSources,
    depCategories,
    depSearch,
    viewMode,
  ]);

  // --- Normál lapozás ---
  useEffect(() => {
    if (page === 1) {
      if (resetFeedKeyRef.current === feedQueryKey) {
        resetFeedKeyRef.current = null;
      }
      return;
    }
    if (resetFeedKeyRef.current === feedQueryKey) return;
    let cancelled = false;
    const requestId = ++feedRequestRef.current;

    (async () => {
      const hasFilters = sourceFilters.length > 0 || categoryFilters.length > 0;
      if (isTodayMode || hasFilters) return;

      const data = await fetchPageData(page, requestId);
      if (cancelled) return;

      if (data === null) return;
      if (data.length === 0) {
        setHasMore(false);
        return;
      }

      setItems((prev) => {
        const merged = [...prev, ...data];
        return merged.filter(
          (item, index, self) => index === self.findIndex((x) => x.id === item.id)
        );
      });

      if (data.length < 10) setHasMore(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [page, depSearch, depSources, depCategories, isTodayMode]);

  // --- Szűrt lapozás ---
  useEffect(() => {
    if (sourcePage === 1) {
      if (resetFeedKeyRef.current === feedQueryKey) {
        resetFeedKeyRef.current = null;
      }
      return;
    }
    if (resetFeedKeyRef.current === feedQueryKey) return;
    let cancelled = false;

    (async () => {
      const hasFilters = sourceFilters.length > 0 || categoryFilters.length > 0;
      if (!hasFilters || isTodayMode) return;

      const requestId = ++feedRequestRef.current;
      const newItems = await fetchFilteredPage(sourcePage, sourceFilters, categoryFilters, requestId);
      if (cancelled) return;

      if (newItems === null) return;
      if (newItems.length === 0) {
        setHasMore(false);
        return;
      }

      setItems((prev) => {
        const merged = [...prev, ...newItems];
        return merged.filter(
          (item, index, self) => index === self.findIndex((x) => x.id === item.id)
        );
      });

      if (newItems.length < 10) setHasMore(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [sourcePage, depSources, depCategories, depSearch, isTodayMode]);

  // --- Infinite scroll ---
  useEffect(() => {
    if (!loaderRef.current) return;

    const el = loaderRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first.isIntersecting || !hasMore) return;
        if (isTodayMode) return;

        const hasFilters = sourceFilters.length > 0 || categoryFilters.length > 0;

        if (hasFilters) {
          setSourcePage((prev) => prev + 1);
        } else {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isTodayMode, depSources, depCategories]);

  return (
    <>
      <FeedList
        items={items}
        expandedId={expandedId}
        setExpandedId={setExpandedId}
        viewMode={viewMode}
      />

      {error && <p className="text-center text-danger mt-3">{error}</p>}

      {!isTodayMode && <div ref={loaderRef} style={{ height: "50px" }} />}

      {loading && <p className="text-center text-muted mt-3">Betöltés...</p>}
      {!hasMore && !isTodayMode && (
        <p className="text-center text-muted mt-3">Nincs több hír.</p>
      )}
    </>
  );
}
