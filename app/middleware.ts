import type { NextRequest } from "next/server";
import "./lib/cron"; // 🔥 cron modul betöltése

export function middleware(req: NextRequest) {
  // Itt nem kell semmit csinálni, csak továbbengedjük a kérést
  return new Response(null, { status: 200 });
}
