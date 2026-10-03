export declare const DUPLICATE_STATES: readonly ["new_article", "same_article", "unknown"];
export interface DedupClusterAdapterInput {
  articleId: number;
  canonicalUrl?: string;
  urlCanonical?: string;
  originalUrl?: string;
  source?: unknown;
  ingestionOutcome?: "inserted" | "deduplicated" | string;
  duplicateState?: "new_article" | "same_article" | "unknown";
  clusterId?: number | string | null;
  clusterResult?: { clusterId?: number | string | null; id?: number | string | null; memberArticleIds?: unknown[]; members?: unknown[] } | null;
  relatedArticleIds?: unknown[];
  relatedArticles?: unknown[];
}
export interface DedupClusterAdapterOutput {
  readonly contractVersion: string;
  readonly article: { readonly id: number; readonly canonicalUrl: string; readonly urlIdentity: string; readonly source: string | null };
  readonly dedup: { readonly state: "new_article" | "same_article" | "unknown"; readonly sourceOfTruth: "legacy_article_identity" };
  readonly cluster: { readonly id: number; readonly memberArticleIds: readonly number[]; readonly sourceOfTruth: "legacy_cluster_assignment" } | null;
  readonly relatedArticleIds: readonly number[] | null;
}
export declare function adaptDedupClusterResult(input: DedupClusterAdapterInput): DedupClusterAdapterOutput;
