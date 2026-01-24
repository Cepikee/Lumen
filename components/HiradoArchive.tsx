"use client";

import { useEffect, useState } from "react";

export default function HiradoArchive() {
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    fetch("/api/hirado/archive")
      .then(r => r.json())
      .then(setVideos);
  }, []);

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold mb-4">Archívum</h2>

      <div className="space-y-3">
        {videos.map((v: any) => (
          <div
            key={v.id}
            className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800"
          >
            <div className="font-semibold">{v.title}</div>
            <div className="text-sm opacity-70">{v.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
