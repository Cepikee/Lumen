import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth-session";
import { evaluatePremium } from "@/lib/entitlements-core";
export { evaluatePremium } from "@/lib/entitlements-core";

export type PremiumReason = "active" | "not_authenticated" | "user_not_found" | "not_premium" | "expired";

export interface PremiumEntitlement {
  userId: number | null;
  active: boolean;
  reason: PremiumReason;
  premiumUntil: Date | null;
  tier: string | null;
}

export async function getPremiumEntitlement(userId: number): Promise<PremiumEntitlement> {
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT is_premium, premium_until, premium_tier FROM users WHERE id = ? LIMIT 1",
    [userId],
  );
  const user = rows[0] as { is_premium: unknown; premium_until?: unknown; premium_tier?: unknown } | undefined;
  return { userId, ...evaluatePremium(user ?? null) };
}

export async function getCurrentPremiumEntitlement(): Promise<PremiumEntitlement> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { userId: null, active: false, reason: "not_authenticated", premiumUntil: null, tier: null };
  }
  return getPremiumEntitlement(userId);
}
