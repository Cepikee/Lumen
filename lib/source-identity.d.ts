export type SourceIdentity = { sourceId: number; key: string; displayName: string; homepageUrl: string; feedUrl: string; aliases: readonly string[] };
export const SOURCES: readonly SourceIdentity[];
export function normalizeSourceIdentity(value: unknown): SourceIdentity | null;
export function sourceIdentityFromUrl(value: unknown): SourceIdentity | null;
export function canonicalSourceKey(value: unknown): string | null;
export function canonicalSourceKeyFromUrl(value: unknown): string | null;
