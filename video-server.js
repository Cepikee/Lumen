import http from "http";
import fs from "fs";
import path from "path";
import url from "url";
import crypto from "crypto";
import { db } from "./lib/db-node.js";
import entitlementsCore from "./lib/entitlements-core.js";

const { evaluatePremium } = entitlementsCore;

function requireSecret(name, minLength = 32) {
  const value = process.env[name];
  if (!value || value.length < minLength) {
    throw new Error(`${name} nincs beállítva vagy túl rövid. Minimum ${minLength} karakter szükséges.`);
  }
  return value;
}

const VIDEO_SIGN_SECRET = requireSecret("VIDEO_SIGN_SECRET", 32);
const ALLOWED_ORIGINS = new Set([
  "https://utom.hu",
  "https://www.utom.hu",
  "http://localhost:3000",
]);
const VIDEO_ROOT = "/var/www/utom/private/videos";

function getClientIp(req) {
  if (process.env.UTOM_TRUST_PROXY_HEADERS !== "true") {
    return req.socket.remoteAddress || "unknown";
  }
  const cf = req.headers["cf-connecting-ip"];
  if (typeof cf === "string" && cf.trim()) return cf.trim();
  const real = req.headers["x-real-ip"];
  if (typeof real === "string" && real.trim()) return real.trim();
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) return xf.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

function isAllowedSource(req) {
  const candidate = req.headers.origin || req.headers.referer || "";
  if (!candidate) return false;
  try {
    return ALLOWED_ORIGINS.has(new URL(candidate).origin);
  } catch {
    return false;
  }
}

async function logVideoAccess(userId, videoId, ip, status) {
  try {
    await db.query(
      "INSERT INTO video_access_logs (user_id, video_id, ip, status) VALUES (?, ?, ?, ?)",
      [userId || 0, videoId || 0, ip || "", status],
    );
  } catch (err) {
    console.error("video_access_logs insert failed:", err instanceof Error ? err.message : "unknown_error");
  }
}

const rateBuckets = new Map();
function rateLimitAccepted(key, now = Date.now()) {
  const windowMs = 5000;
  const limit = 20;
  let bucket = rateBuckets.get(key) || [];
  bucket = bucket.filter((ts) => now - ts < windowMs);
  if (bucket.length >= limit) {
    if (bucket.length) rateBuckets.set(key, bucket);
    return false;
  }
  bucket.push(now);
  rateBuckets.set(key, bucket);
  if (rateBuckets.size > 10_000) {
    for (const [bucketKey, timestamps] of rateBuckets) {
      if (!timestamps.some((ts) => now - ts < windowMs)) rateBuckets.delete(bucketKey);
    }
  }
  return true;
}

function verifyToken(query) {
  const { v, u, e, s } = query || {};
  if (![v, u, e, s].every((value) => typeof value === "string" && value.length > 0)) return false;
  if (!/^\d+$/.test(v) || !/^\d+$/.test(u) || !/^\d+$/.test(e) || !/^[a-f0-9]{64}$/.test(s)) return false;

  const expires = Number(e);
  if (!Number.isSafeInteger(expires)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (expires < now || expires > now + 5 * 60) return false;

  const expected = crypto.createHmac("sha256", VIDEO_SIGN_SECRET).update(`${v}:${u}:${e}`).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const suppliedBuffer = Buffer.from(s, "hex");
  return expectedBuffer.length === suppliedBuffer.length && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}

function parseRange(range, fileSize) {
  if (!range) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match) return false;

  const [, startRaw, endRaw] = match;
  if (!startRaw && !endRaw) return false;

  let start;
  let end;
  if (!startRaw) {
    const suffixLength = Number(endRaw);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return false;
    const length = Math.min(suffixLength, fileSize);
    start = fileSize - length;
    end = fileSize - 1;
  } else {
    start = Number(startRaw);
    end = endRaw ? Number(endRaw) : fileSize - 1;
  }

  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return false;
  if (start < 0 || end < start || start >= fileSize) return false;
  end = Math.min(end, fileSize - 1);
  return { start, end };
}

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url || !req.url.startsWith("/api/secure/video/")) {
      res.writeHead(404);
      return res.end("Not found");
    }

    const ip = getClientIp(req);
    let userIdForLog = null;
    let videoIdForLog = null;

    if (!isAllowedSource(req)) {
      await logVideoAccess(userIdForLog, videoIdForLog, ip, "denied");
      res.writeHead(403);
      return res.end("Forbidden (hotlink)");
    }

    const parsedUrl = url.parse(req.url, true);
    const id = req.url.split("/").pop().split("?")[0];
    if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
      res.writeHead(400);
      return res.end("Invalid video id");
    }
    videoIdForLog = Number(id);

    if (!verifyToken(parsedUrl.query)) {
      await logVideoAccess(userIdForLog, videoIdForLog, ip, "denied");
      res.writeHead(403);
      return res.end("Forbidden (invalid token)");
    }

    const cookie = req.headers.cookie || "";
    const match = cookie.match(/(?:^|;\s*)session_user=([^;]+)/);
    if (!match) {
      await logVideoAccess(userIdForLog, videoIdForLog, ip, "denied");
      res.writeHead(401);
      return res.end("Unauthorized");
    }
    const token = match[1];
    if (!/^[a-f0-9]{64}$/.test(token)) {
      res.writeHead(401);
      return res.end("Unauthorized");
    }
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const [sessions] = await db.query(
      `SELECT s.user_id FROM user_sessions s INNER JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP() LIMIT 1`,
      [tokenHash],
    );
    if (!sessions.length) {
      res.writeHead(401);
      return res.end("Unauthorized");
    }

    const userId = String(sessions[0].user_id);
    if (String(parsedUrl.query.u) !== userId || String(parsedUrl.query.v) !== String(videoIdForLog)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    userIdForLog = userId;

    if (!rateLimitAccepted(`${userId}:${ip}`)) {
      await logVideoAccess(userIdForLog, videoIdForLog, ip, "denied");
      res.writeHead(429);
      return res.end("Too many requests");
    }

    const [userRows] = await db.query(
      "SELECT id, is_premium, premium_until, premium_tier, last_ip FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
    const user = userRows[0];
    if (!user || !evaluatePremium(user).active) {
      await logVideoAccess(userIdForLog, videoIdForLog, ip, "denied");
      res.writeHead(403);
      return res.end("Forbidden");
    }

    if (user.last_ip && user.last_ip !== ip) {
      await logVideoAccess(userIdForLog, videoIdForLog, ip, "denied");
      res.writeHead(403);
      return res.end("IP mismatch (session locked)");
    }

    const [videoRows] = await db.query("SELECT id, file_url FROM videos WHERE id = ? LIMIT 1", [videoIdForLog]);
    if (!videoRows.length) {
      await logVideoAccess(userIdForLog, videoIdForLog, ip, "denied");
      res.writeHead(404);
      return res.end("Not found");
    }

    const filename = path.basename(String(videoRows[0].file_url || ""));
    if (!filename || filename === "." || filename === "..") {
      res.writeHead(404);
      return res.end("Not found");
    }
    const filePath = path.join(VIDEO_ROOT, filename);
    if (!fs.existsSync(filePath)) {
      await logVideoAccess(userIdForLog, videoIdForLog, ip, "denied");
      res.writeHead(404);
      return res.end("File missing");
    }

    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size <= 0) {
      res.writeHead(404);
      return res.end("File missing");
    }
    const fileSize = stat.size;
    const parsedRange = parseRange(req.headers.range, fileSize);
    if (parsedRange === false) {
      res.writeHead(416, { "Content-Range": `bytes */${fileSize}`, "Accept-Ranges": "bytes" });
      return res.end();
    }

    await logVideoAccess(userIdForLog, videoIdForLog, ip, "allowed");
    if (parsedRange) {
      const { start, end } = parsedRange;
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": "video/mp4",
        "X-Content-Type-Options": "nosniff",
      });
      return fs.createReadStream(filePath, { start, end }).pipe(res);
    }

    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
    });
    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error("video_server_request_failed", error instanceof Error ? error.message : "unknown_error");
    if (!res.headersSent) res.writeHead(500);
    return res.end("Server error");
  }
});

const port = Number(process.env.VIDEO_SERVER_PORT || 3001);
const host = process.env.VIDEO_SERVER_HOST || "127.0.0.1";
server.listen(port, host, () => {
  console.log(`Video server running on ${host}:${port}`);
});
