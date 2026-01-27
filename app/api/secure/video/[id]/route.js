import fs from "fs";
import path from "path";
import express from "express";
import { db } from "./db.js"; // vagy ahol a DB-d van

const router = express.Router();

router.get("/api/secure/video/:id", async (req, res) => {
  const id = req.params.id;

  let userId = null;

  // Debug bypass
  if (req.query.debug === "true") {
    userId = "1";
  }

  // Cookie auth
  if (!userId) {
    const cookie = req.headers.cookie || "";
    const match = cookie.match(/session_user=([^;]+)/);
    if (!match) return res.status(401).send("Unauthorized");
    userId = match[1];
  }

  // User check
  const [userRows] = await db.query(
    "SELECT id, is_premium FROM users WHERE id = ? LIMIT 1",
    [userId]
  );

  if (!Array.isArray(userRows) || userRows.length === 0) {
    return res.status(401).send("Unauthorized");
  }

  const user = userRows[0];
  if (user.is_premium !== 1) {
    return res.status(403).send("Forbidden");
  }

  // Video lookup
  const [videoRows] = await db.query(
    "SELECT id, file_url FROM videos WHERE id = ? LIMIT 1",
    [id]
  );

  if (!Array.isArray(videoRows) || videoRows.length === 0) {
    return res.status(404).send("Not found");
  }

  const video = videoRows[0];
  const filename = path.basename(video.file_url);
  const filePath = `/var/www/utom/private/videos/${filename}`;

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File missing");
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Range streaming
  if (range) {
    const parts = range.replace("bytes=", "").split("-");
    const start = Number(parts[0]);
    const end = parts[1] ? Number(parts[1]) : fileSize - 1;

    const chunkSize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
    });

    file.pipe(res);
    return;
  }

  // Full file streaming
  res.writeHead(200, {
    "Content-Length": fileSize,
    "Content-Type": "video/mp4",
  });

  fs.createReadStream(filePath).pipe(res);
});

export default router;
