"use client";

import { useEffect, useState } from "react";

export default function HiradoArchive() {
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/hirado/archive", {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      setVideos(json.videos || []);
    }
    load();
  }, []);

  if (!videos.length) {
    return (
      <div className="mt-4 opacity-60">
        Nincs archív híradó.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {videos.map((v) => {
        const formatted = new Date(v.date).toLocaleDateString("hu-HU", {
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
