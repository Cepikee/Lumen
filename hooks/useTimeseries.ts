import useSWR from "swr";

function normalizeTimeseriesResponse(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid timeseries response");
  }
  const raw = value as Record<string, unknown>;
  return {
    ...raw,
    points: Array.isArray(raw.points) ? raw.points : [],
    categories: Array.isArray(raw.categories) ? raw.categories : [],
  };
}

const fetcher = (url: string) =>
  fetch(url, {
    cache: "no-store",
    headers: {
      "x-api-key": "",
    },
  }).then((r) => {
    if (!r.ok) throw new Error("Fetch error");
    return r.json().then(normalizeTimeseriesResponse);
  });

export function useTimeseries(category: string, period: "7d" | "30d" | "90d") {
  const q = new URLSearchParams();
  q.set("category", category);
  q.set("period", period);

  const url = `/api/premium-insights/timeseries?${q.toString()}`;

  const { data, error, isValidating } = useSWR(url, fetcher, {
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
