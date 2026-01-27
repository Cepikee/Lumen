import http from "http";
import fs from "fs";
import path from "path";
import url from "url";
import crypto from "crypto";
import { db } from "./lib/db-node.js";

// 🔐 Secret betöltése
const VIDEO_SIGN_SECRET =
  process.env.VIDEO_SIGN_SECRET ||
  "3f9c1e8b7a2d4f0c9e1a7b3d6c4f8e2a5d7c9b1e3f6a8d4c7b2e9f1a3c5d7e9";

// 🔐 Token ellenőrzés — MOSTANTÓL TILT IS
function verifyToken(query) {
  const { v, u, e, s } = query || {};
  console.log("Incoming token params:", query);

  // Debug mód → mindent átenged
  if (query.debug === "true") {
    console.log("DEBUG MODE → token bypass");
    return true;
  }

  // Ha bármi hiányzik → TILTÁS
  if (!v || !u || !e || !s) {
    console.log("Missing token parts → DENY");
    return false;
  }

  const expires = parseInt(e, 10);
  if (Number.isNaN(expires)) {
    console.log("Invalid expires → DENY");
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > expires) {
    console.log("Token expired → DENY");
    return false;
  }

  const payload = `${v}:${u}:${e}`;
  const expected = crypto
    .createHmac("sha256", VIDEO_SIGN_SECRET)
    .update(payload)
    .digest("hex");

  if (expected !== s) {
    console.log("Bad signature → DENY");
    return false;
  }

  console.log("Token OK");
  return true;
}

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith("/api/secure/video/")) {
    res.writeHead(404);
    return res.end("Not found");
  }

  // 🔐 Token ellenőrzés — MOSTANTÓL TILT
  const parsedUrl = url.parse(req.url, true);

  if (!verifyToken(parsedUrl.query)) {
    res.writeHead(403);
    return res.end("Forbidden (invalid token)");
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
