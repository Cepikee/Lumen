import fs from "fs";
import path from "path";
import { db } from "@/lib/db";

function nodeStreamToWebStream(nodeStream) {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

export async function GET(req, context) {
  const id = context.params.id;

  const url = new URL(req.url);
  let userId = null;

  // Debug bypass
  if (url.searchParams.get("debug") === "true") {
    userId = "1";
  }

  // Cookie auth
  if (!userId) {
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/session_user=([^;]+)/);
    if (!match) return new Response("Unauthorized", { status: 401 });
    userId = match[1];
  }

  // User check
  const [userRows] = await db.query(
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

  // Video lookup
  const [videoRows] = await db.query(
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

  // Range streaming
  if (range) {
    const parts = range.replace("bytes=", "").split("-");
    const start = Number(parts[0]);
    const end = parts[1] ? Number(parts[1]) : fileSize - 1;

    const chunkSize = end - start + 1;
    const nodeStream = fs.createReadStream(filePath, { start, end });
    const webStream = nodeStreamToWebStream(nodeStream);

    return new Response(webStream, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": "video/mp4",
      },
    });
  }

  // Full file streaming
  const nodeStream = fs.createReadStream(filePath);
  const webStream = nodeStreamToWebStream(nodeStream);

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Length": String(fileSize),
      "Content-Type": "video/mp4",
    },
  });
}
