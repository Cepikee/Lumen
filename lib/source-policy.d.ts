import type { SourceIdentity } from "./source-identity";

export type SourcePolicy = Readonly<{
  reviewStatus: "legal_review_required";
  manualApprovalRequired: true;
  feedMetadata: "allow";
  feedContent: "legacy_feed_content" | "full_feed_content";
  directArticleFetch: "observe_only";
  externalImages: "deny_without_documented_rights";
  termsUrl: string;
  machineRestriction: string;
  knownRestriction: string;
  checkedAt: string;
}>;
export const SOURCE_POLICIES: Readonly<Record<string, SourcePolicy>>;
export function sourcePolicyForIdentity(value: unknown): { source: SourceIdentity; policy: SourcePolicy | null } | null;
export function sourcePolicyForUrl(value: unknown): { source: SourceIdentity; policy: SourcePolicy | null } | null;
export function directFetchDecision(value: unknown): { allowed: boolean; reason: string; source?: SourceIdentity; policy?: SourcePolicy };
export function assertDirectArticleFetchAllowed(value: unknown): { allowed: true; reason: string; source?: SourceIdentity; policy?: SourcePolicy };
export function assertFeedProcessingAllowed(value: unknown): { source: SourceIdentity | null; policy: SourcePolicy | null };
