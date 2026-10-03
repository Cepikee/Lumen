// app/api/insights/forecast/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";

const CATEGORY_LABELS = new Map([
  ["politika", "Politika"],
  ["gazdaság", "Gazdaság"],
  ["közélet", "Közélet"],
  ["kultúra", "Kultúra"],
  ["sport", "Sport"],
  ["tech", "Tech"],
  ["egészségügy", "Egészségügy"],
  ["oktatás", "Oktatás"],
]);

function normalizeCategory(value: unknown): string {
  const key = String(value ?? "").trim().toLocaleLowerCase("hu-HU");
  return CATEGORY_LABELS.get(key) ?? "Ismeretlen";
}

function normalizeDate(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function GET(req: Request) {
  const sec = await securityCheck(req);
  if (sec) return sec;

  try {
    const [rows]: any = await db.query(`
      SELECT category, date, predicted
      FROM forecast
      ORDER BY category, date
    `);

    const result: Record<string, any[]> = {};

    for (const r of rows) {
      const cat = normalizeCategory(r.category);
      const date = normalizeDate(r.date);
      const predicted = Number(r.predicted);
      if (!date || !Number.isFinite(predicted) || predicted < 0) continue;
      if (!result[cat]) result[cat] = [];

      result[cat].push({
        date,
        predicted,
      });
    }

    return NextResponse.json({
      success: true,
      forecast: result,
    });

  } catch (err) {
    console.error("Forecast API error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
