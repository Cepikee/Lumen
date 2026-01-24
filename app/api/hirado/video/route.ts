// app/api/hirado/video/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");

  if (!date) {
    return new NextResponse("Missing date", { status: 400 });
  }

  // IDE tedd a videókat:
  // /private/hirado/2026-01-25.mp4
  const filePath = path.join(
    process.cwd(),
    "private",
    "hirado",
    `${date}.mp4`
  );

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = fs.readFileSync(filePath);

  return new NextResponse(file, {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Cache-Control": "no-store",
    },
  });
}
