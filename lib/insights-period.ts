import { businessDayBounds } from "@/lib/business-time";

export type InsightsPeriod = "today" | "24h" | "7d" | "30d" | "90d";

const PERIOD_MS: Record<InsightsPeriod, number> = {
  "today": 0,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

export function normalizeInsightsPeriod(value: string | null | undefined): InsightsPeriod {
  if (
    value === "today" || value === "24h" ||
    value === "7d" ||
    value === "30d" ||
    value === "90d"
  ) {
    return value;
  }

  return "24h";
}

export function resolveInsightsWindow(
  value: string | null | undefined,
  now = new Date()
) {
  const period = normalizeInsightsPeriod(value);
  const end = new Date(now);
  const start = period === "today" ? businessDayBounds(end).start : new Date(end.getTime() - PERIOD_MS[period]);

  return {
    period,
    start,
    end,
    timezone: "Europe/Budapest" as const,
    semantics: period === "today" ? "Budapesti naptári nap 00:00-tól mostanáig" : period === "24h" ? "Gördülő 24 óra" : "Gördülő időablak",
  };
}
