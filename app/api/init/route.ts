import { NextResponse } from "next/server";
// import "../../../lib/cron.js"; // 

export async function GET() {
  return NextResponse.json({ message: "Cron fut a háttérben!" });
}
