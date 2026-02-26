"use client";

import useSWR from "swr";
import Spinner from "react-bootstrap/Spinner";
import { useUserStore } from "@/store/useUserStore";

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

interface TimelineItem {
  source: string;
  publishedAt: string;
}

export default function WSourceSpeedIndexTimeline({ clusterId }: { clusterId: number }) {
  const theme = useUserStore((s) => s.theme);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR<{
    success: boolean;
    items: TimelineItem[];
  }>(
    `/api/insights/speedindex/timeline?cluster_id=${clusterId}`,
    fetcher,
    { refreshInterval: 60000 }
  );

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (error || !data?.success) {
    return <div className="p-4 text-red-500">Nem sikerült betölteni a timeline adatokat.</div>;
  }

  const items = data.items;

  return (
    <div
      className={`p-4 rounded border ${
        isDark ? "border-[#1e293b] text-white" : "border-[#e5e7eb] text-black"
      }`}
      style={{ backgroundColor: "var(--bs-body-bg)" }}
    >
      <h3 className="text-lg font-semibold mb-4 text-center">
        Hír terjedése időrendben
      </h3>

      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div
            key={i}
            className={`p-3 rounded border ${
              isDark ? "border-[#1e293b]" : "border-[#e5e7eb]"
            }`}
            style={{ backgroundColor: "var(--bs-body-bg)" }}
          >
            <div className="font-semibold">{item.source}</div>
            <div className="text-sm opacity-80">
              {new Date(item.publishedAt).toLocaleString("hu-HU")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
