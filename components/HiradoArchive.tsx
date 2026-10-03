"use client";

import { useEffect, useState } from "react";

export default function HiradoArchive() {
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const res = await fetch("/api/hirado/archive", {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`archive_${res.status}`);
        const json = await res.json();
        const videos = Array.isArray(json?.videos) ? json.videos : [];
        setVideos(videos.filter((video: any) => {
          const id = Number(video?.id);
          return Number.isSafeInteger(id) && id > 0 &&
            typeof video?.date === "string" && !Number.isNaN(Date.parse(video.date));
        }));
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") setVideos([]);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  if (!videos.length) {
    return (
      <div className="opacity-60 mt-4">
        Nincs archív híradó.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {videos.map((v) => {
        const formatted = new Date(v.date).toLocaleDateString("hu-HU", {
          timeZone: "Europe/Budapest",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });

        return (
          <a
            key={v.id}
            href={`/hirado?video=${v.id}`}
            className="block p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
          >
            Utom Híradó: {formatted}
          </a>
        );
      })}
    </div>
  );
}
