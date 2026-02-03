import useSWR from "swr";

export function useForecast() {
  return useSWR("/api/insights/forecast", (url) =>
    fetch(url).then((r) => r.json())
  );
}
