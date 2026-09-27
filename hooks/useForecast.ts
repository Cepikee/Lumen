import useSWR from "swr";

export function useForecast() {
  return useSWR("/api/premium-insights/forecast", (url) =>
    fetch(url, {
      headers: {
        "x-api-key": "",
      },
    }).then((r) => r.json())
  );
}
