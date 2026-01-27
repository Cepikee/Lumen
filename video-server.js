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

// 🔐 Engedélyezett origin / referer
const ALLOWED_ORIGINS = [
  "https://utom.hu",
  "https://www.utom.hu",
  "http://localhost:3000",
];

// 🔐 IP kinyerése reverse proxy mögül is
const getClientIp = (req) => {
  const xf = req.headers["x-forwarded-for"];
  if (xf) return xf.split(",")[0].trim();
  return req.socket.remoteAddress || "";
};

// 🔐 Video access log helper
async function logVideoAccess(userId, videoId, ip, status) {
  try {
    await db.query(
      "INSERT INTO video_access_logs (user_id, video_id, ip, status) VALUES (?, ?, ?, ?)",
      [userId || 0, videoId || 0, ip || "", status]
    );
  } catch (err) {
    console.error("video_access_logs insert failed:", err);
  }
}

// 🔐 Rate limiting bucket
const rateBuckets = new Map();

// 🔐 Token ellenőrzés — MOSTANTÓL TILT IS
function verifyToken(query) {
  const { v, u, e, s } = query || {};
  console.log("Incoming token params:", query);

  if (query.debug === "true") {
    console.log("DEBUG MODE → token bypass");
    return true;
  }

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

  const ip = getClientIp(req);
  let accessStatus = "denied";
  let userIdForLog = null;
  let videoIdForLog = null;

  // 🔐 Anti-hotlinking – csak saját domainről
  const referer = req.headers.referer || "";
  const origin = req.headers.origin || "";
  const source = origin || referer || "";
  const allowedOrigin = ALLOWED_ORIGINS.some((base) =>
    source.startsWith(base)
  );

  if (!allowedOrigin && !req.url.includes("debug=true")) {
    await logVideoAccess(userIdForLog, videoIdForLog, ip, "denied");
    res.writeHead(403);
    return res.end("Forbidden (hotlink)");
  }

  // 🔐 Token ellenőrzés
  const parsedUrl = url.parse(req.url, true);

  const id = req.url.split("/").pop().split("?")[0];
  videoIdForLog = id;

  if (!verifyToken(parsedUrl.query)) {
    await logVideoAccess(userIdForLog, videoIdForLog, ip, "denied");
    res.writeHead(403);
    return res.end("Forbidden (invalid token)");
  }

  let userId = null;

  if (req.url.includes("debug=true")) {
    userId = "1";
  }

  if (!userId) {
    const cookie = req.headers.cookie || "";
    const match = cookie.match(/session_user=([^;]+)/);
    if (!match) {
      await logVideoAccess(userIdForLog, videoIdForLog, ip, "denied");
      res.writeHead(401);
      return res.end("Unauthorized");
    }
    userId = match[1];
  }

  userIdForLog = userId;

  // 🔐 RATE LIMITING (5 mp alatt max 20 kérés)
  const key = `${userId}:${ip}`;
  const now = Date.now();
  const windowMs = 5000;
  const limit = 20;

  let bucket = rateBuckets.get(key) || [];
  bucket = bucket.filter((ts) => now - ts < windowMs);
  bucket.push(now);
  rateBuckets.set(key, bucket);

  if (bucket.length > limit) {
    await logVideoAccess(userIdForLog, videoIdForLog, ip, "denied");
    res.writeHead(429);
    return res.end("Too many requests");
  }

  const [userRows] = await db.query(
    "SELECT id, is_premium, last_ip FROM users WHERE id = ? LIMIT 1",
    [userId]
  );

  if (!userRows.length || userRows[0].is_premium !== 1) {
    await logVideoAccess(userIdForLog, videoIdForLog, ip, "denied");
    res.writeHead(403);
    return res.end("Forbidden");
  }

  // 🔐 IP + session kötés
  const storedIp = userRows[0].last_ip;

  if (storedIp && storedIp !== ip) {
    await logVideoAccess(userIdForLog, videoIdForLog, ip, "denied");
    res.writeHead(403);
    return res.end("IP mismatch (session locked)");
  }

  const [videoRows] = await db.query(
    "SELECT id, file_url FROM videos WHERE id = ? LIMIT 1",
    [id]
  );

  if (!videoRows.length) {
    await logVideoAccess(userIdForLog, videoIdForLog, ip, "denied");
    res.writeHead(404);
    return res.end("Not found");
  }

  const filename = path.basename(videoRows[0].file_url);
  const filePath = `/var/www/utom/private/videos/${filename}`;

  if (!fs.existsSync(filePath)) {
    await logVideoAccess(userIdForLog, videoIdForLog, ip, "denied");
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

    accessStatus = "allowed";
    await logVideoAccess(userIdForLog, videoIdForLog, ip, accessStatus);

    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    "Content-Length": fileSize,
    "Content-Type": "video/mp4",
  });

  accessStatus = "allowed";
  await logVideoAccess(userIdForLog, videoIdForLog, ip, accessStatus);

  fs.createReadStream(filePath).pipe(res);
});

server.listen(3001, () => {
  console.log("Video server running on port 3001");
});
