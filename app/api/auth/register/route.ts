import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { email, password, pin } = await req.json();

  if (!email || !password || !pin) {
    return NextResponse.json({ success: false, message: "Hiányzó adatok." });
  }

  const [existing]: any = await db.query(
    "SELECT id FROM users WHERE email = ?",
    [email]
  );

  if (existing.length > 0) {
    return NextResponse.json({ success: false, message: "Ez az email már létezik." });
  }

  const password_hash = await bcrypt.hash(password, 10);

  await db.query(
    "INSERT INTO users (email, password_hash, pin_code) VALUES (?, ?, ?)",
    [email, password_hash, pin]
  );

  return NextResponse.json({ success: true });
}
