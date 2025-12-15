import { NextResponse } from "next/server";
import "../../../lib/cron.js"; // 🔥 cron modul betöltése

export async function GET() {
  return NextResponse.json({ message: "Cron fut a háttérben!" });
}
