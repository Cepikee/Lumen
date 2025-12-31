"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function CikkOldal() {
  const params = useParams();
  const id = params?.id as string;

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    setLoading(true);

    fetch(`/api/summaries?id=${id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const article = Array.isArray(data) ? data[0] : data;
        setItem(article);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: "40px" }}>
        ⏳ Betöltés…
      </div>
    );
  }

  if (!item || !item.id) {
    return (
      <div style={{ padding: "40px" }}>
        ❌ Cikk nem található.
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", maxWidth: "720px", margin: "0 auto" }}>
      <h1>{item.title}</h1>

      <p className="text-muted mb-2">
        📰 {item.source_name ?? "Ismeretlen forrás"} •{" "}
        {item.created_at
          ? new Date(item.created_at).toLocaleDateString("hu-HU")
          : ""}
      </p>

      <p>{item.content}</p>

      <hr />

      <div style={{ whiteSpace: "pre-line" }}>
        {item.detailed_content}
      </div>
    </div>
  );
}
