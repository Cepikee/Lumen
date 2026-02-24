"use client";

import useSWR from "swr";

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
  const { data, error, isLoading } = useSWR<ApiResponse>(
    "/api/insights/trending-keywords",
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 text-gray-500">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
        <span className="ml-2">Betöltés...</span>
      </div>
    );
  }

  if (error || !data?.success || !data.keywords?.length) {
    return <div className="text-gray-500">Ma még nincsenek felkapott kulcsszavak.</div>;
  }

  const keywords = data.keywords;
  const max = Math.max(...keywords.map((k) => k.count));

  const barColor = {
    mild: "bg-yellow-400",
    strong: "bg-orange-500",
    brutal: "bg-red-600",
  };

  const badgeColor = {
    mild: "bg-yellow-100 text-yellow-700",
    strong: "bg-orange-100 text-orange-700",
    brutal: "bg-red-100 text-red-700",
  };

  const getLevelText = (level: KeywordItem["level"]) => {
    if (level === "brutal") return "brutál spike";
    if (level === "strong") return "erős spike";
    if (level === "mild") return "enyhe spike";
    return "";
  };

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 p-6">
      <h5 className="text-lg font-semibold text-gray-900 mb-6 text-center">
        Felkapott kulcsszavak ma
      </h5>

      <div className="space-y-5">
        {keywords.map((item, idx) => {
          const percentage = (item.count / max) * 100;

          return (
            <div key={idx} className="flex items-center gap-4">
              
              {/* Kulcsszó + badge */}
              <div className="w-40 flex flex-col">
                <span className="font-semibold text-gray-800">{item.keyword}</span>

                {item.level && (
                  <span
                    className={`mt-1 w-fit px-2 py-0.5 text-xs rounded-full ${badgeColor[item.level]}`}
                  >
                    {getLevelText(item.level)}
                  </span>
                )}
              </div>

              {/* Sáv */}
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor[item.level ?? "mild"]}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Szám */}
              <div className="w-16 text-right font-bold text-gray-900">
                {item.count} db
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
