export function parsePublicationTime(value: unknown): Date | null;
export function toMysqlUtc(date: Date): string;
export function resolvePublicationTime(values: Array<{ value: unknown; source: string }>, now?: Date): { date: Date; mysqlUtc: string; source: string };
