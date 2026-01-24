"use client";

import { useEffect, useState } from "react";
import HiradoPlayerWrapper from "./HiradoPlayerWrapper";
import HiradoArchive from "@/components/HiradoArchive";

export default function HiradoPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/hirado/today", { cache: "no-store" });
      const json = await res.json();
      setData(json);
    }
    load();
  }, []);

  if (!data) return <div className="p-6">Betöltés...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Utom Híradó</h1>

      {!data.hasVideo && (
        <div className="text-lg opacity-70">Ma még nincs híradó.</div>
      )}

      {data.hasVideo && (
        <HiradoPlayerWrapper video={data.video} />
      )}

      <HiradoArchive />
    </div>
  );
}
