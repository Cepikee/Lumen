import useSWR from "swr";

/* --- API típusok --- */
export type InsightApiItem = {
  category?: string | null;
  trendScore?: number;
  articleCount?: number;
  sourceDiversity?: number | string;
  lastArticleAt?: string | null;
  sparkline?: number[];
  ringSources?: { name: string; label: string; count: number; percent: number; }[];
};

export type InsightsResponse = {
  categories?: InsightApiItem[];
  items?: InsightApiItem[];
};

function normalizeInsightsResponse(value: unknown): InsightsResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid insights response");
  }
  const raw = value as Record<string, unknown>;
  return {
    ...raw,
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    items: Array.isArray(raw.items) ? raw.items : [],
  } as InsightsResponse;
}

/* --- fetcher --- */
const fetcher = (url: string) =>
  fetch(url, {
    cache: "no-store",
    headers: {
      "x-api-key": "",
    },
  }).then((r) => {
    if (!r.ok) throw new Error("Fetch error");
    return r.json().then(normalizeInsightsResponse);
  });

/* --- useInsights hook --- */
export function useInsights(period: "24h" | "7d" | "30d" | "90d", sort: string) {
  const q = new URLSearchParams();
  q.set("period", period);
  q.set("sort", sort);

  const url = `/api/premium-insights?${q.toString()}`;

  const { data, error, isValidating } = useSWR<InsightsResponse>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  return {
    data,
    error,
    loading: !data && !error,
    isValidating,
  };
}
