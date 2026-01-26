import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;

  // 1) Cookie → userId
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/session_user=([^;]+)/);

  if (!match) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const userId = match[1];

  // 2) User lekérése DB-ből
  const [userRows]: any = await db.query(
    `SELECT id, is_premium 
     FROM users 
     WHERE id = ? 
     LIMIT 1`,
    [userId]
  );

  if (!userRows.length) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const user = userRows[0];

  if (user.is_premium !== 1) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // 3) Videó lekérése DB-ből
  const [videoRows]: any = await db.query(
    `SELECT id, file_url 
     FROM videos 
     WHERE id = ? 
     LIMIT 1`,
    [id]
  );

  if (!videoRows.length) {
    return new NextResponse("Not found", { status: 404 });
  }

  const video = videoRows[0];

  const filename = path.basename(video.file_url);
  const filePath = `/var/www/utom/private/videos/${filename}`;

  if (!fs.existsSync(filePath)) {
    return new NextResponse("File missing", { status: 404 });
  }

  // 4) Range header (tekerés)
  const range = req.headers.get("range");
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const file = fs.createReadStream(filePath, { start, end });

    return new NextResponse(file as any, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize.toString(),
        "Content-Type": "video/mp4",
      },
    });
  }

  // 5) Teljes videó stream
  const file = fs.createReadStream(filePath);

  return new NextResponse(file as any, {
    status: 200,
    headers: {
      "Content-Length": fileSize.toString(),
      "Content-Type": "video/mp4",
    },
  });
}
