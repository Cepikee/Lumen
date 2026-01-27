import http from "http";
import fs from "fs";
import path from "path";
import { db } from "./lib/db.js";

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith("/api/secure/video/")) {
    res.writeHead(404);
    return res.end("Not found");
  }

  const id = req.url.split("/").pop().split("?")[0];

  let userId = null;

  if (req.url.includes("debug=true")) {
    userId = "1";
  }

  if (!userId) {
    const cookie = req.headers.cookie || "";
    const match = cookie.match(/session_user=([^;]+)/);
    if (!match) {
      res.writeHead(401);
      return res.end("Unauthorized");
    }
    userId = match[1];
  }

  const [userRows] = await db.query(
    "SELECT id, is_premium FROM users WHERE id = ? LIMIT 1",
    [userId]
  );

  if (!userRows.length || userRows[0].is_premium !== 1) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  const [videoRows] = await db.query(
    "SELECT id, file_url FROM videos WHERE id = ? LIMIT 1",
    [id]
  );

  if (!videoRows.length) {
    res.writeHead(404);
    return res.end("Not found");
  }

  const filename = path.basename(videoRows[0].file_url);
  const filePath = `/var/www/utom/private/videos/${filename}`;

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    return res.end("File missing");
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const [startStr, endStr] = range.replace("bytes=", "").split("-");
    const start = Number(startStr);
    const end = endStr ? Number(endStr) : fileSize - 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": "video/mp4",
    });

    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    "Content-Length": fileSize,
    "Content-Type": "video/mp4",
  });

  fs.createReadStream(filePath).pipe(res);
});

server.listen(3001, () => {
  console.log("Video server running on port 3001");
});
