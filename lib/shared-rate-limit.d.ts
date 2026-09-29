import type { Pool } from "mysql2/promise";
export function consumeRateLimit(pool: Pool, options: { scope?: string; identity: string; limit?: number; windowMs?: number; nowMs?: number }): Promise<{ accepted: boolean; key: string; windowStartMs: number; expiresAt: Date }>;
export function consumeRateLimitFailClosed(pool: Pool, options: { scope?: string; identity: string; limit?: number; windowMs?: number; nowMs?: number }): Promise<boolean>;
export function cleanupExpiredRateLimits(pool: Pool, batchSize?: number): Promise<number>;
