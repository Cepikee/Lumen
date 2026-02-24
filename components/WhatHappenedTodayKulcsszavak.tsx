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
    <div>
      <h5 className="text-lg font-semibold mb-3">Felkapott kulcsszavak ma</h5>

      <div className="space-y-3">
        {data.map((item, idx) => (
          <div
            key={idx}
            className={`bg-white shadow-sm rounded-lg p-4 border-l-4 ${
              item.level ? leftBorderColors[item.level] : "border-l-gray-300"
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span>📈</span>
                  <span className="font-semibold text-gray-800">{item.keyword}</span>
                </div>

                {item.level && (
                  <span
                    className={`inline-block mt-2 px-2 py-1 text-xs rounded ${levelColors[item.level]}`}
                  >
                    {getLevelText(item.level)}
                  </span>
                )}
              </div>

              <div className="text-right font-bold text-gray-900 text-lg">
                {item.count} db
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
