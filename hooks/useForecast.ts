import useSWR from "swr";
import {useSearchParams} from "next/navigation";

export function useForecast() {
  const search=useSearchParams();
  const category=search.get("category");
  const key=search.has("source")||search.has("keyword")||search.has("cluster")?null:`/api/premium-insights/forecast${category?"?category="+encodeURIComponent(category):""}`;
  return useSWR(key, (url) =>
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
