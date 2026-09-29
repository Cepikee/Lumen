export type SourceIdentity = { sourceId: number; key: string; displayName: string; aliases: readonly string[] };
export const SOURCES: readonly SourceIdentity[];
export function normalizeSourceIdentity(value: unknown): SourceIdentity | null;
export function sourceIdentityFromUrl(value: unknown): SourceIdentity | null;
