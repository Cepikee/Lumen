export const INSIGHTS_QUALITY_POLICY = Object.freeze({
  sentiment: Object.freeze({ minAnalyzed: 20, minCoverage: 0.2, minSources: 2 }),
  clickbait: Object.freeze({ minAnalyzed: 20, minCoverage: 0.2, minSources: 2 }),
  sourceClickbait: Object.freeze({ minAnalyzed: 5, minCoverage: 0.2, minSources: 1 }),
  category: Object.freeze({ minAnalyzed: 20, minCoverage: 0.2, minSources: 2 }),
  categorySentiment: Object.freeze({ minAnalyzed: 10, minCoverage: 0.2 }),
  minTrendBuckets: 3,
  minTimelinePoints: 3,
  minLifecycleMentions: 10,
  minPropagationArticles: 2,
});

export type QualityLevel = "none" | "very-low" | "low" | "sufficient";

export function metricQuality(analyzedCount: number, eligibleCount: number, policy: { minAnalyzed: number; minCoverage: number; minSources?: number }, sourceCount = Number.POSITIVE_INFINITY) {
  const analyzed = Number.isFinite(analyzedCount) ? Math.max(0, analyzedCount) : 0;
  const eligible = Number.isFinite(eligibleCount) ? Math.max(0, eligibleCount) : 0;
  const coverage = eligible > 0 ? analyzed / eligible : 0;
  const sources = Number.isFinite(sourceCount) ? Math.max(0, sourceCount) : Number.POSITIVE_INFINITY;
  const enoughSources = policy.minSources == null || sources >= policy.minSources;
  const level: QualityLevel = analyzed === 0 || eligible === 0 ? "none"
    : analyzed < Math.min(5, policy.minAnalyzed) || coverage < Math.min(0.05, policy.minCoverage) ? "very-low"
      : analyzed < policy.minAnalyzed || coverage < policy.minCoverage || !enoughSources ? "low" : "sufficient";
  return { analyzed, eligible, coverage, sources, level, canVisualize: level === "sufficient" };
}

export const sentimentQuality = (analyzed: number, eligible: number, sources?: number) => metricQuality(analyzed, eligible, INSIGHTS_QUALITY_POLICY.sentiment, sources);
export const clickbaitQuality = (analyzed: number, eligible: number, sources?: number) => metricQuality(analyzed, eligible, INSIGHTS_QUALITY_POLICY.clickbait, sources);
export const sourceClickbaitQuality = (analyzed: number, eligible: number) => metricQuality(analyzed, eligible, INSIGHTS_QUALITY_POLICY.sourceClickbait, 1);
export const categoryQuality = (categorized: number, eligible: number, sources?: number) => metricQuality(categorized, eligible, INSIGHTS_QUALITY_POLICY.category, sources);
export const categorySentimentQuality = (analyzed: number, eligible: number) => metricQuality(analyzed, eligible, INSIGHTS_QUALITY_POLICY.categorySentiment);

export function isKnownCategory(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toLocaleLowerCase("hu-HU") : "";
  return normalized !== "" && normalized !== "ismeretlen" && normalized !== "unknown" && normalized !== "n/a";
}

export function hasEnoughTrendBuckets(points: unknown[]) {
  return Array.isArray(points) && points.length >= INSIGHTS_QUALITY_POLICY.minTrendBuckets;
}

export function hasEnoughTimelinePoints(points: Array<{ total?: number }>) {
  return Array.isArray(points) && points.filter(point => Number(point?.total) > 0).length >= INSIGHTS_QUALITY_POLICY.minTimelinePoints;
}

export function isPropagationCluster(cluster: { count?: number; sources?: number }) {
  return Number(cluster?.count) >= INSIGHTS_QUALITY_POLICY.minPropagationArticles || Number(cluster?.sources) >= 2;
}
