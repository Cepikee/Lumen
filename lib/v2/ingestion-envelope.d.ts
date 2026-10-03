export type IngestionEnvelopeResult =
  | { outcome: "invalid"; reason: "invalid_article" | "invalid_url"; operationKey?: string; envelope: null }
  | {
      outcome: "normalized";
      envelope: Readonly<{
        envelopeVersion: string;
        article: Readonly<{
          canonicalUrl: string;
          urlIdentity: string;
          title: string | null;
          contentText: string | null;
        }>;
        source: Readonly<{ sourceId: number; key: string; displayName: string }> | null;
        publication: Readonly<{ occurredAt: string | null; source: string | null }>;
        observedAt: string | null;
        provenance: Readonly<{ requestId: string | null; runId: string | null; operationKey: string }>;
        normalization: Readonly<{
          text: string;
          source: string;
          url: string;
          publicationTime: string;
        }>;
      }>;
    };

export function createIngestionEnvelope(
  item: Record<string, unknown> | null | undefined,
  options?: { context?: { requestId?: string | null; runId?: string | null } | null },
): IngestionEnvelopeResult;
export function normalizeText(value: unknown): string | null;
