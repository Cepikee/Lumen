export declare const ENTITY_TYPES: readonly ["person", "company", "organization", "location", "project", "product", "topic"];
export interface EntityExtractionEnvelope {
  envelopeVersion: string;
  article: { canonicalUrl: string; urlIdentity: string; title?: string | null; contentText?: string | null };
}
export interface EntityExtractionCandidate {
  mentionText: string;
  normalizedCandidateName: string;
  entityType: (typeof ENTITY_TYPES)[number];
  confidence: number;
  evidence: { start: number; end: number };
}
export interface EntityExtractionResult {
  readonly contractVersion: string;
  readonly inputEnvelopeVersion: string;
  readonly article: { readonly canonicalUrl: string; readonly urlIdentity: string };
  readonly entities: readonly EntityExtractionCandidate[];
}
export declare function canonicalText(envelope: EntityExtractionEnvelope): string | null;
export declare function validateEntityExtractionInput(envelope: unknown): { status: "valid"; text: string } | { status: "invalid"; errors: readonly string[] };
export declare function validateEntityExtractionResult(envelope: unknown, rawResult: unknown): { status: "valid"; result: EntityExtractionResult } | { status: "invalid"; errors: readonly string[] };
