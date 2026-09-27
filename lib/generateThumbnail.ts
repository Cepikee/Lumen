import { execFile } from "node:child_process";
import { mkdir, realpath } from "node:fs/promises";
import path from "path";

let activeJobs = 0;
const MAX_CONCURRENT_JOBS = 1;

function isWithin(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export async function generateThumbnail(videoPath: string, outputName: string): Promise<string> {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(outputName)) throw new Error("invalid_output_name");
  if (activeJobs >= MAX_CONCURRENT_JOBS) throw new Error("thumbnail_worker_busy");

  const inputRoot = await realpath(process.env.VIDEO_INPUT_DIR || "/var/www/utom/private/videos");
  const inputPath = await realpath(path.resolve(inputRoot, videoPath));
  if (!isWithin(inputRoot, inputPath)) throw new Error("video_path_outside_allowed_directory");

  const outputRoot = path.resolve(process.cwd(), "public", "thumbnails");
  await mkdir(outputRoot, { recursive: true });
  const outputPath = path.resolve(outputRoot, `${outputName}.jpg`);
  if (!isWithin(outputRoot, outputPath)) throw new Error("thumbnail_path_outside_allowed_directory");

  activeJobs += 1;
  try {
    await new Promise<void>((resolve, reject) => {
      execFile(
        process.env.FFMPEG_PATH || "ffmpeg",
        ["-nostdin", "-i", inputPath, "-ss", "00:00:01", "-vframes", "1", "-vf", "scale=320:-1", outputPath, "-y"],
        { timeout: 60_000, windowsHide: true, maxBuffer: 1024 * 1024 },
        (error) => error ? reject(error) : resolve(),
      );
    });
    return `/thumbnails/${outputName}.jpg`;
  } finally {
    activeJobs -= 1;
  }
}
