import type { Connection } from "mysql2/promise";
export function ingestFeedArticle(connection: Connection, item: Record<string, unknown>): Promise<{
  outcome: string;
  articleId: number | null;
  canonicalUrl?: string;
  source?: string;
  publicationTimeSource?: string;
  v2?: {
    envelope: import("./v2/ingestion-envelope").IngestionEnvelopeResult;
    persistence: { outcome: "persisted"; id: number; inserted: boolean } | { outcome: "skipped" | "failed"; reason: string };
  };
}>;
