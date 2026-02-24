"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";
import Spinner from "react-bootstrap/Spinner";
import { useUserStore } from "@/store/useUserStore";
import type { ApexOptions } from "apexcharts"; // csak a struktúra egységessége miatt

// (ApexChart dinamikus import nincs használatban itt, de benne van az import-struktúra egységességéért)
const Dummy = dynamic(() => Promise.resolve(() => null), { ssr: false });

interface KeywordItem {
  keyword: string;
  count: number;
  level: "mild" | "strong" | "brutal" | null;
}

interface ApiResponse {
  success: boolean;
  keywords: KeywordItem[];
}

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

export default function TrendingKeywords() {
  const theme = useUserStore((s) => s.theme);
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR<ApiResponse>(
    "/api/insights/trending-keywords",
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
    }
  );

  // LOADING
  if (isLoading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  // ERROR / EMPTY
  if (error || !data?.success || !data.keywords?.length) {
    return <div className="text-muted">Ma még nincsenek felkapott kulcsszavak.</div>;
  }

  // SORT
  const keywords = [...data.keywords].sort((a, b) => b.count - a.count);
  const max = Math.max(...keywords.map((k) => k.count));

  // COLORS (dark mode figyelembevételével)
  const barColor = {
    mild: isDark ? "bg-yellow-300" : "bg-yellow-400",
    strong: isDark ? "bg-orange-400" : "bg-orange-500",
    brutal: isDark ? "bg-red-500" : "bg-red-600",
  } as const;

  const badgeColor = {
    mild: isDark ? "bg-yellow-900/10 text-yellow-300" : "bg-yellow-100 text-yellow-700",
    strong: isDark ? "bg-orange-900/10 text-orange-300" : "bg-orange-100 text-orange-700",
    brutal: isDark ? "bg-red-900/10 text-red-300" : "bg-red-100 text-red-700",
  } as const;

  const getLevelText = (level: KeywordItem["level"]) => {
    if (level === "brutal") return "brutál spike";
    if (level === "strong") return "erős spike";
    if (level === "mild") return "enyhe spike";
    return "";
  };

  return (
    <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
      <h5 className="text-lg font-semibold mb-3 text-center text-gray-900 dark:text-gray-100">
        Felkapott kulcsszavak ma
      </h5>

      <div className="space-y-4">
        {keywords.map((item, idx) => {
          const percentage = max > 0 ? (item.count / max) * 100 : 0;

          return (
            <div
              key={idx}
              className="flex items-center gap-4"
              role="listitem"
              aria-label={`${item.keyword} ${item.count} említés`}
            >
              {/* Kulcsszó + badge */}
              <div className="w-44 flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 dark:text-gray-300">📈</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                    {item.keyword}
                  </span>
                </div>

                {item.level && (
                  <span
                    className={`mt-1 w-fit px-2 py-0.5 text-xs rounded-full ${badgeColor[item.level]}`}
                  >
                    {getLevelText(item.level)}
                  </span>
                )}
              </div>

              {/* Sáv (ApexChart stílusú, de Tailwind-only) */}
              <div className="flex-1 min-w-0">
                <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-600 ${barColor[item.level ?? "mild"]}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                {/* opcionális kis meta sor */}
                <div className="mt-2 flex items-center justify-between text-xs text-gray-400 dark:text-gray-400">
                  <div className="truncate max-w-[60%]">
                    {item.level ? `${getLevelText(item.level)}` : "—"}
                  </div>
                  <div className="ml-2">{Math.round(percentage)}%</div>
                </div>
              </div>

              {/* Szám */}
              <div className="w-20 text-right font-bold text-gray-900 dark:text-gray-100">
                {item.count} db
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
