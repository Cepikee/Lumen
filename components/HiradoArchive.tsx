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
      <div className="mt-10 opacity-60">
        Nincs archív híradó.
      </div>
    );
  }

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold mb-4">Archívum</h2>

      <div className="space-y-3">
        {videos.map((v) => (
          <a
            key={v.id}
            href={`/hirado?video=${v.id}`}
            className="block p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
          >
            <div className="font-semibold">{v.title}</div>
            <div className="text-sm opacity-70">{v.date}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
