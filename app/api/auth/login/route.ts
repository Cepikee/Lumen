import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { email, password, pin } = await req.json();

  const [rows]: any = await db.query("SELECT * FROM users WHERE email = ?", [email]);

  if (rows.length === 0) {
    return NextResponse.json({ success: false, message: "Nincs ilyen felhasználó" });
  }

  const user = rows[0];

  const validPass = await bcrypt.compare(password, user.password_hash);
  if (!validPass) {
    return NextResponse.json({ success: false, message: "Hibás jelszó" });
  }

  if (user.pin_code !== pin) {
    return NextResponse.json({ success: false, message: "Hibás PIN" });
  }

  // 🔥 SESSION COOKIE LÉTREHOZÁSA
  const response = NextResponse.json({ success: true });

  response.cookies.set("session_user", String(user.id), {
    httpOnly: true,
    secure: false, // majd élesben true lesz
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 nap
  });

  return response;
}
