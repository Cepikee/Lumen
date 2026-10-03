import { getSessionUserId } from "@/lib/auth-session";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validatePin } from "@/lib/auth-policy";
import { hashPin, verifyPin } from "@/lib/pin-security";

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Nincs bejelentkezve." },
        { status: 401 }
      );
    }


    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Érvénytelen kérés." },
        { status: 400 }
      );
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Érvénytelen kérés." },
        { status: 400 }
      );
    }
    const { currentPin, newPin } = body as { currentPin?: unknown; newPin?: unknown };

    // 1) Validáció
    if (typeof currentPin !== "string" || typeof newPin !== "string" || !currentPin || !newPin) {
      return NextResponse.json(
        { success: false, message: "Minden mező kötelező." },
        { status: 400 }
      );
    }

    if (!validatePin(newPin)) {
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
    if (!(await verifyPin(currentPin, user.pin_code)).valid) {
      return NextResponse.json(
        { success: false, message: "Hibás jelenlegi PIN." },
        { status: 400 }
      );
    }

    // 4) Új PIN mentése
    await db.query(
      "UPDATE users SET pin_code = ? WHERE id = ?",
      [await hashPin(newPin), userId]
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
