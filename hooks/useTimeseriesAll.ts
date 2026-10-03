import useSWR from "swr";

function normalizeTimeseriesResponse(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid timeseries response");
  }
  const raw = value as Record<string, unknown>;
  return {
    ...raw,
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

export function useTimeseriesAll(period: "24h" | "7d" | "30d" | "90d") {
  const q = new URLSearchParams();
  q.set("period", period);

  const url = `/api/premium-insights/timeseries/all?${q.toString()}`;

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
