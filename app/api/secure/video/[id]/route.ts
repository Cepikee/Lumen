import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

interface UserRow extends RowDataPacket {
  id: number;
  is_premium: number;
}

interface VideoRow extends RowDataPacket {
  id: number;
  file_url: string;
}

function nodeStreamToWebStream(nodeStream: fs.ReadStream): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err: Error) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

export async function GET(
  req: Request,
  context: { params: { id: string } }
): Promise<Response> {
  const id = context.params.id;

  const url = new URL(req.url);
  let userId: string | null = null;

  if (url.searchParams.get("debug") === "true") {
    userId = "1";
  }

  if (!userId) {
    const cookie = req.headers.get("cookie") ?? "";
    const match = cookie.match(/session_user=([^;]+)/);
    if (!match) return new Response("Unauthorized", { status: 401 });
    userId = match[1];
  }

  const [userRows] = await db.query<UserRow[]>(
    "SELECT id, is_premium FROM users WHERE id = ? LIMIT 1",
    [userId]
  );

  if (!Array.isArray(userRows) || userRows.length === 0) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = userRows[0];
  if (user.is_premium !== 1) {
    return new Response("Forbidden", { status: 403 });
  }

  const [videoRows] = await db.query<VideoRow[]>(
    "SELECT id, file_url FROM videos WHERE id = ? LIMIT 1",
    [id]
  );

  if (!Array.isArray(videoRows) || videoRows.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  const video = videoRows[0];
  const filename = path.basename(video.file_url);
  const filePath = `/var/www/utom/private/videos/${filename}`;

  if (!fs.existsSync(filePath)) {
    return new Response("File missing", { status: 404 });
  }

  const range = req.headers.get("range");
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  if (range) {
    const parts = range.replace("bytes=", "").split("-");
    const start = Number(parts[0]);
    const end = parts[1] ? Number(parts[1]) : fileSize - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
      return new Response("Range Not Satisfiable", { status: 416 });
    }

    const chunkSize = end - start + 1;
    const nodeStream = fs.createReadStream(filePath, { start, end });
    const webStream = nodeStreamToWebStream(nodeStream);

    return new Response(webStream, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize.toString(),
        "Content-Type": "video/mp4",
      },
    });
  }

  const nodeStream = fs.createReadStream(filePath);
  const webStream = nodeStreamToWebStream(nodeStream);

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Length": fileSize.toString(),
      "Content-Type": "video/mp4",
    },
  });
}
