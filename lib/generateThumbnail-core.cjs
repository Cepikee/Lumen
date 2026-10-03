"use strict";

const { execFile } = require("node:child_process");
const { mkdir, realpath, stat, unlink } = require("node:fs/promises");
const path = require("node:path");

let activeJobs = 0;
const MAX_CONCURRENT_JOBS = 1;

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function generateThumbnail(videoPath, outputName) {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(outputName)) throw new Error("invalid_output_name");
  if (activeJobs >= MAX_CONCURRENT_JOBS) throw new Error("thumbnail_worker_busy");
  activeJobs += 1;
  let outputPath;
  try {
    const inputRoot = await realpath(process.env.VIDEO_INPUT_DIR || "/var/www/utom/private/videos");
    const inputPath = await realpath(path.resolve(inputRoot, videoPath));
    if (!isWithin(inputRoot, inputPath)) throw new Error("video_path_outside_allowed_directory");
    const outputRoot = path.resolve(process.cwd(), "public", "thumbnails");
    await mkdir(outputRoot, { recursive: true });
    outputPath = path.resolve(outputRoot, `${outputName}.jpg`);
    if (!isWithin(outputRoot, outputPath)) throw new Error("thumbnail_path_outside_allowed_directory");
    await unlink(outputPath).catch(() => undefined);
    await new Promise((resolve, reject) => {
      const configuredTimeout = Number(process.env.FFMPEG_TIMEOUT_MS);
      const timeout = Number.isInteger(configuredTimeout) && configuredTimeout >= 100 && configuredTimeout <= 60_000 ? configuredTimeout : 60_000;
      execFile(process.env.FFMPEG_PATH || "ffmpeg", ["-nostdin", "-i", inputPath, "-ss", "00:00:01", "-vframes", "1", "-vf", "scale=320:-1", outputPath, "-y"], { timeout, windowsHide: true, maxBuffer: 1024 * 1024 }, (error) => error ? reject(error) : resolve());
    });
    const output = await stat(outputPath).catch(() => null);
    if (!output || !output.isFile() || output.size === 0) throw new Error("thumbnail_output_invalid");
    return `/thumbnails/${outputName}.jpg`;
  } catch (error) {
    if (outputPath) await unlink(outputPath).catch(() => undefined);
    throw error;
  } finally {
    activeJobs -= 1;
  }
}

module.exports = { generateThumbnail };
