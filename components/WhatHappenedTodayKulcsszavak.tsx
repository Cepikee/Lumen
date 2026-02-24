"use client";

import { useEffect, useState } from "react";

interface KeywordItem {
  keyword: string;
  count: number;
  level: "mild" | "strong" | "brutal" | null;
}

interface ApiResponse {
  success: boolean;
  keywords: KeywordItem[];
}

export default function TrendingKeywords() {
  const [data, setData] = useState<KeywordItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/insights/trending-keywords", {
          headers: {
            "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
          },
        });

        const json: ApiResponse = await res.json();
        if (json.success) {
          setData(json.keywords);
        }
      } catch (err) {
        console.error("Trending keywords fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4 text-gray-500">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
        <span className="ml-2">Betöltés...</span>
      </div>
    );
  }

  if (!data.length) {
    return <div className="text-gray-500">Ma még nincsenek felkapott kulcsszavak.</div>;
  }

  const levelColors: Record<string, string> = {
    mild: "bg-yellow-100 text-yellow-800",
    strong: "bg-orange-100 text-orange-800",
    brutal: "bg-red-100 text-red-800",
  };

  const leftBorderColors: Record<string, string> = {
    mild: "border-l-yellow-400",
    strong: "border-l-orange-500",
    brutal: "border-l-red-600",
  };

  const getLevelText = (level: KeywordItem["level"]) => {
    if (level === "brutal") return "brutál spike";
    if (level === "strong") return "erős spike";
    if (level === "mild") return "enyhe spike";
    return "";
  };

  return (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 p-6">
    <div className="flex items-center justify-between mb-6">
      <h5 className="text-lg font-semibold text-gray-900">
        Felkapott kulcsszavak ma
      </h5>
      <span className="text-sm text-gray-400">
        {data.length} találat
      </span>
    </div>

    <div className="space-y-4">
      {data.map((item, idx) => {
        const max = Math.max(...data.map((d) => d.count));
        const percentage = (item.count / max) * 100;

        return (
          <div
            key={idx}
            className="group relative rounded-xl border border-gray-100 bg-white p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 group-hover:text-indigo-500 transition">
                    📈
                  </span>
                  <span className="font-semibold text-gray-800">
                    {item.keyword}
                  </span>
                </div>

                {item.level && (
                  <span
                    className={`w-fit px-2.5 py-1 text-xs font-medium rounded-full
                      ${
                        item.level === "brutal"
                          ? "bg-red-50 text-red-600"
                          : item.level === "strong"
                          ? "bg-orange-50 text-orange-600"
                          : "bg-yellow-50 text-yellow-600"
                      }`}
                  >
                    {getLevelText(item.level)}
                  </span>
                )}

                {/* Progress bar */}
                <div className="mt-2 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500
                      ${
                        item.level === "brutal"
                          ? "bg-red-500"
                          : item.level === "strong"
                          ? "bg-orange-500"
                          : "bg-yellow-500"
                      }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              <div className="ml-4 text-right">
                <div className="text-lg font-bold text-gray-900">
                  {item.count}
                </div>
                <div className="text-xs text-gray-400">említés</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
}