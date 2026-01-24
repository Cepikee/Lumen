"use client";

import { useEffect, useState } from "react";
import HiradoPlayer from "@/components/HiradoPlayer";
import HiradoArchive from "@/components/HiradoArchive";

export default function HiradoPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/hirado/today", {
          cache: "no-store",
        });
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("HIRADO FETCH ERROR:", err);
      }
    }

    load();
  }, []);

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        Betöltés...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Utom Híradó</h1>

      {!data.hasVideo && (
        <div className="text-lg opacity-70">
          Ma még nincs híradó. Nézz vissza később.
        </div>
      )}

      {data.hasVideo && (
        <div>
          <HiradoPlayer video={data.video} />
        </div>
      )}

      <HiradoArchive />
    </div>
  );
}
