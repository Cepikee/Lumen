import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exec } from "child_process";
import path from "path";

function generateThumbnail(videoPath: string, outputName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(process.cwd(), "public", "thumbnails", `${outputName}.jpg`);

    const cmd = `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" "${outputPath}" -y`;

    exec(cmd, (err) => {
      if (err) return reject(err);
      resolve(`/thumbnails/${outputName}.jpg`);
    });
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const [rows]: any = await db.query(
    "SELECT file_url FROM videos WHERE id = ? LIMIT 1",
    [id]
  );

  if (!rows.length) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // 🔥 NEM nyúlunk hozzá, abszolút pathként használjuk
  const fileUrl: string = rows[0].file_url;
  const videoPath = fileUrl; // már teljes abszolút útvonal

  try {
    const thumbnailUrl = await generateThumbnail(videoPath, `thumb_${id}`);

    await db.query(
      "UPDATE videos SET thumbnail_url = ? WHERE id = ?",
      [thumbnailUrl, id]
    );

    return NextResponse.json({ success: true, thumbnail: thumbnailUrl });
  } catch (err) {
    return NextResponse.json(
      { error: "FFmpeg error", details: String(err) },
      { status: 500 }
    );
  }
}
