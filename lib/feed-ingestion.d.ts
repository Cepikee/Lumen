import type { Connection } from "mysql2/promise";
export function ingestFeedArticle(connection: Connection, item: Record<string, unknown>): Promise<{ outcome: string; articleId: number | null; canonicalUrl?: string; source?: string; publicationTimeSource?: string }>;
