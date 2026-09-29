import type { Pool } from "mysql2/promise";
export function requestReset(pool: Pool, options: { kind: "password" | "pin"; email: string; ip: string; baseUrl: string }): Promise<{ created: boolean }>;
