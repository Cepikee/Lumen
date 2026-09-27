import type { PremiumEntitlement } from "./entitlements";
export function evaluatePremium(
  user: { is_premium: unknown; premium_until?: unknown; premium_tier?: unknown } | null,
  now?: Date,
): Omit<PremiumEntitlement, "userId">;
