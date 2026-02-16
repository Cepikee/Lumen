import { NextResponse } from "next/server";
import { cleanCategories } from "@/scripts/cleanCategories";

export async function GET() {
  await cleanCategories();
  return NextResponse.json({ ok: true });
}
