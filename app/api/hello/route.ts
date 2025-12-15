import { NextResponse } from "next/server";
import "../../../lib/cron"; // 🔥 cron modul betöltése

export async function GET() {
  return NextResponse.json({ message: "Hello World + Cron fut!" });
}
