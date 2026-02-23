import useSWR from "swr";

export function useForecast() {
  return useSWR("/api/insights/forecast", (url) =>
    fetch(url, {
      headers: {
        "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
      },
    }).then((r) => r.json())
  );
}
