"use client";

import useSWR from "swr";
import { useUserStore } from "@/store/useUserStore";

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

export default function WSourceClickbait() {
  // --- Téma Zustandból ---
  const theme = useUserStore((s) => s.theme);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // --- API hívás ---
  const { data, error, isLoading } = useSWR(
    "/api/insights/clickbait",
    fetcher,
    { refreshInterval: 60000 }
  );

  // --- Alap állapotok ---
  if (isLoading) {
    return (
      <div className={isDark ? "text-gray-300" : "text-gray-700"}>
        Clickbait adatok betöltése…
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className={isDark ? "text-red-400" : "text-red-600"}>
        Hiba történt a clickbait adatok lekérésekor.
      </div>
    );
  }

  const sources = data.sources || [];

  return (
    <div
      className={`p-4 rounded-lg border ${
        isDark
          ? "bg-[#111] border-gray-800 text-gray-200"
          : "bg-white border-gray-200 text-gray-800"
      }`}
    >
      <h2 className="text-xl font-semibold mb-4">
        Forrásonkénti Clickbait Index
      </h2>

      {sources.length === 0 && (
        <div className="opacity-70">Nincs még clickbait adat.</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {sources.map((src: any) => (
          <div
            key={src.source}
            className={`min-w-[150px] p-3 rounded border flex flex-col items-center ${
              isDark
                ? "border-[#1e293b] text-white bg-[#0f172a]"
                : "border-[#e5e7eb] text-black bg-white"
            }`}
            style={{
              backgroundColor: "var(--bs-body-bg)",
            }}
          >
            <span className="font-medium">{src.source}</span>
            <span className="text-xl font-bold mt-1">
              {Number(src.avg_clickbait).toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
