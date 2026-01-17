import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { token, newPin } = await req.json();

    if (!token || !newPin) {
      return NextResponse.json(
        { success: false, error: "Hiányzó adatok." },
        { status: 400 }
      );
    }

    // 🔥 1) PIN validáció
    if (!/^\d{4}$/.test(newPin)) {
      return NextResponse.json(
        { success: false, error: "A PIN kódnak 4 számjegyből kell állnia." },
        { status: 400 }
      );
    }

    // 🔥 2) Token keresése
    const [rows]: any = await db.query(
      "SELECT userId, expiresAt FROM pin_reset_tokens WHERE token = ? LIMIT 1",
      [token]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Érvénytelen vagy lejárt token." },
        { status: 400 }
      );
    }

    const { userId, expiresAt } = rows[0];

    // 🔥 3) Token lejárati idő ellenőrzése
    if (new Date(expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: "A token lejárt." },
        { status: 400 }
      );
    }

    // 🔥 4) PIN frissítése
    await db.query(
      "UPDATE users SET pin_code = ? WHERE id = ?",
      [newPin, userId]
    );

    // 🔥 5) Token törlése
    await db.query("DELETE FROM pin_reset_tokens WHERE token = ?", [token]);

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("PIN reset error:", err);
    return NextResponse.json(
      { success: false, error: "Váratlan hiba történt." },
      { status: 500 }
    );
  }
}
