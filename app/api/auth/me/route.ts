import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/session_user=([^;]+)/);

  if (!match) {
    return NextResponse.json({ loggedIn: false });
  }

  const userId = match[1];

  const [rows]: any = await db.query("SELECT id, email FROM users WHERE id = ?", [userId]);

  if (rows.length === 0) {
    return NextResponse.json({ loggedIn: false });
  }

  return NextResponse.json({
    loggedIn: true,
    user: rows[0],
  });
}
