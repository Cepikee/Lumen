export const ZONE: "Europe/Budapest";
export function parts(date: Date, timeZone?: string): { year: number; month: number; day: number; hour: number; minute: number; second: number };
export function localToUtc(local: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number }, timeZone?: string): Date;
export function businessDayBounds(date?: Date, timeZone?: string): { start: Date; end: Date; timeZone: string };
export function businessWeekBounds(date?: Date, timeZone?: string): { start: Date; end: Date; timeZone: string };
export function businessMonthBounds(date?: Date, timeZone?: string): { start: Date; end: Date; timeZone: string };
export function mysqlUtc(date: Date): string;
export function hourInZone(date: Date, timeZone?: string): number;
