import useSWR from "swr";

export function useForecast() {
  return useSWR("/api/premium-insights/forecast", (url) =>
    fetch(url, {
      cache: "no-store",
      headers: {
        "x-api-key": "",
      },
    }).then(async (r) => {
      if (!r.ok) throw new Error(`forecast_http_${r.status}`);
      const data = await r.json();
      if (!data || typeof data !== "object") throw new Error("forecast_invalid_response");
      return data;
    })
  );
}
