import type { Pool, PoolConnection } from "mysql2/promise";
export type OutboxPayload = { to: string; subject: string; text: string; html: string };
export function encryptPayload(payload: OutboxPayload, env?: NodeJS.ProcessEnv): string;
export function decryptPayload(value: string, env?: NodeJS.ProcessEnv): OutboxPayload;
export function enqueueEmail(connection: PoolConnection, options: { operationKey: string; kind: string; recipient: string; payload: OutboxPayload }): Promise<void>;
export function claimNextEmail(pool: Pool): Promise<{ id: number; claimToken: string; payload: OutboxPayload } | null>;
export function markEmailSent(pool: Pool, item: { id: number; claimToken: string }): Promise<void>;
export function processNextEmail(pool: Pool, send: (payload: OutboxPayload) => Promise<unknown>, hooks?: { afterSend?: (item: unknown) => Promise<void> }): Promise<number | null>;
