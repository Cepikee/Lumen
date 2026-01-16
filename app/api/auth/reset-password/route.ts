import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ success: false, error: "Missing token or password" });
    }

    // 1) Token keresése
    const [rows]: any = await db.query(
      "SELECT * FROM password_reset_tokens WHERE token = ? LIMIT 1",
      [token]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid or expired token" });
    }

    const resetToken = rows[0];

    // 2) Lejárati idő ellenőrzése
    const now = new Date();
    if (new Date(resetToken.expiresAt) < now) {
      return NextResponse.json({ success: false, error: "Token expired" });
    }

    const userId = resetToken.userId;

    // 3) Jelszó hashelése
    const hashed = await bcrypt.hash(password, 10);

    // 4) Jelszó frissítése a users táblában
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashed, userId]);

    // 5) Token törlése
    await db.query("DELETE FROM password_reset_tokens WHERE token = ?", [token]);

    // 🔥 Siker jelzés a frontendnek
    return NextResponse.json({ success: true, redirect: "/?resetSuccess=1" });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
