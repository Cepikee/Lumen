import { exec } from "child_process";
import path from "path";

export function generateThumbnail(videoPath: string, outputName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(process.cwd(), "public", "thumbnails", `${outputName}.jpg`);

    const cmd = `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" "${outputPath}" -y`;

    exec(cmd, (err) => {
      if (err) return reject(err);
      resolve(`/thumbnails/${outputName}.jpg`);
    });
  });
}
