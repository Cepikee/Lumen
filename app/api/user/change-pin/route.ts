import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionUser = cookieStore.get("session_user");

    if (!sessionUser) {
      return NextResponse.json(
        { success: false, message: "Nincs bejelentkezve." },
        { status: 401 }
      );
    }

    const userId = Number(sessionUser.value);

    const { currentPin, newPin } = await req.json();

    // 1) Validáció
    if (!currentPin || !newPin) {
      return NextResponse.json(
        { success: false, message: "Minden mező kötelező." },
        { status: 400 }
      );
    }

    if (!/^\d{4}$/.test(newPin)) {
      return NextResponse.json(
        { success: false, message: "A PIN kódnak 4 számjegyből kell állnia." },
        { status: 400 }
      );
    }

    // 2) User lekérése
    const [rows]: any = await db.query(
      "SELECT id, pin_code FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Felhasználó nem található." },
        { status: 404 }
      );
    }

    const user = rows[0];

    // 3) Jelenlegi PIN ellenőrzése
    if (String(user.pin_code) !== String(currentPin)) {
      return NextResponse.json(
        { success: false, message: "Hibás jelenlegi PIN." },
        { status: 400 }
      );
    }

    // 4) Új PIN mentése
    await db.query(
      "UPDATE users SET pin_code = ? WHERE id = ?",
      [newPin, userId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PIN change error:", err);
    return NextResponse.json(
      { success: false, message: "Váratlan hiba történt." },
      { status: 500 }
    );
  }
}
