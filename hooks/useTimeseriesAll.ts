import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url, {
    cache: "no-store",
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => {
    if (!r.ok) throw new Error("Fetch error");
    return r.json();
  });

export function useTimeseriesAll(period: "24h" | "7d" | "30d" | "90d") {
  const q = new URLSearchParams();
  q.set("period", period);

  const url = `/api/insights/timeseries/all?${q.toString()}`;

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
