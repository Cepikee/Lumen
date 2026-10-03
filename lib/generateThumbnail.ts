import { generateThumbnail as generate } from "./generateThumbnail-core.cjs";

export async function generateThumbnail(videoPath: string, outputName: string): Promise<string> {
  return generate(videoPath, outputName);
}
