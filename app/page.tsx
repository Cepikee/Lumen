"use client";

import React, { useEffect, useState, useRef, useContext } from "react";
import FeedList from "@/components/FeedList";
import type { FeedItem } from "@/components/FeedItemCard";
import { LayoutContext } from "@/components/LayoutContext";

export default function Page() {
  const layout = useContext(LayoutContext);

  // Ha valamiért nincs context (elméletben nem kéne), fallback:
  const viewMode = layout?.viewMode ?? "card";
  const isTodayMode = layout?.isTodayMode ?? false;
  const sourceFilters = layout?.sourceFilters ?? [];

  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [sourcePage, setSourcePage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loaderRef = useRef<HTMLDivElement | null>(null);

  async function fetchFilteredPage(pageNum: number, sources: string[]) {
    const query = sources.map((s) => `source=${encodeURIComponent(s)}`).join("&");
    const res = await fetch(
      `/api/summaries?page=${pageNum}&limit=10&${query}`,
      { cache: "no-store" }
    );
    const raw = await res.json();
    if (!Array.isArray(raw)) return [];
    return raw.map((item: any) => ({
      ...item,
      ai_clean: Number(item.ai_clean),
    })) as FeedItem[];
  }

  async function fetchPageData(pageNum: number) {
    if (loading || isTodayMode || sourceFilters.length > 0) return [];
    setLoading(true);
    try {
      const res = await fetch(
        `/api/summaries?page=${pageNum}&limit=10`,
        { cache: "no-store" }
      );
      if (!res.ok) return [];
      const raw = await res.json();
      return raw.map((item: any) => ({
        ...item,
        ai_clean: Number(item.ai_clean),
      })) as FeedItem[];
    } catch (err) {
      console.error("Fetch error:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }

  async function loadToday() {
    setLoading(true);
    try {
      const res = await fetch(`/api/summaries?today=true`, {
        cache: "no-store",
      });
      const raw = await res.json();
      const data = raw.map((item: any) => ({
        ...item,
        ai_clean: Number(item.ai_clean),
      })) as FeedItem[];
      setItems(data);
      setHasMore(false);
    } catch (err) {
      console.error("Today filter error:", err);
      setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadFilteredFirstPage() {
    const firstPage = await fetchFilteredPage(1, sourceFilters);
    if (!firstPage || firstPage.length === 0) {
      setItems([]);
      setHasMore(false);
      return;
    }
    setItems(firstPage);
    setHasMore(firstPage.length === 10);
    setSourcePage(1);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setItems([]);
      setPage(1);
      setSourcePage(1);
      setHasMore(true);

      if (isTodayMode) {
        await loadToday();
        return;
      }

      if (sourceFilters.length > 0) {
        await loadFilteredFirstPage();
        return;
      }

      const first = await fetchPageData(1);
      if (cancelled) return;
      if (!first || first.length === 0) {
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
  }, [isTodayMode, JSON.stringify(sourceFilters)]);

  useEffect(() => {
    if (page === 1) return;
    let cancelled = false;
    (async () => {
      const data = await fetchPageData(page);
      if (cancelled) return;
      if (!data || data.length === 0) {
        setHasMore(false);
        return;
      }
      setItems((prev) => {
        const merged = [...prev, ...data];
        return merged.filter(
          (item, index, self) =>
            index === self.findIndex((x) => x.id === item.id)
        );
      });
      if (data.length < 10) setHasMore(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [page]);

  useEffect(() => {
    if (sourcePage === 1) return;
    let cancelled = false;
    (async () => {
      const newItems = await fetchFilteredPage(sourcePage, sourceFilters);
      if (cancelled) return;
      if (!newItems || newItems.length === 0) {
        setHasMore(false);
        return;
      }
      setItems((prev) => {
        const merged = [...prev, ...newItems];
        return merged.filter(
          (item, index, self) =>
            index === self.findIndex((x) => x.id === item.id)
        );
      });
      if (newItems.length < 10) setHasMore(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sourcePage, JSON.stringify(sourceFilters)]);

  useEffect(() => {
    if (!loaderRef.current) return;
    const el = loaderRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first.isIntersecting || !hasMore) return;
        if (isTodayMode) return;
        if (sourceFilters.length > 0) {
          setSourcePage((prev) => prev + 1);
        } else {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isTodayMode, JSON.stringify(sourceFilters)]);

  return (
    <>
      <FeedList
        items={items}
        expandedId={expandedId}
        setExpandedId={setExpandedId}
        viewMode={viewMode}
      />

      {!isTodayMode && <div ref={loaderRef} style={{ height: "50px" }} />}

      {loading && (
        <p className="text-center text-muted mt-3">Betöltés...</p>
      )}
      {!hasMore && !isTodayMode && (
        <p className="text-center text-muted mt-3">Nincs több hír.</p>
      )}
    </>
  );
}
