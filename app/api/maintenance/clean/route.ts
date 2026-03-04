import { NextResponse } from "next/server";
import { exec } from "child_process";

export async function GET() {
  return new Promise<NextResponse>((resolve) => {
    exec("node scripts/cleanCategoriesRunner.js", (err, stdout, stderr) => {
      if (err) {
        console.error("CLEAN ERROR:", err);
        resolve(NextResponse.json({ ok: false }));
        return;
      }

      console.log(stdout);
      resolve(NextResponse.json({ ok: true }));
    });
  });
}
