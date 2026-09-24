import { revokeAllUserSessions, clearSessionCookie } from "@/lib/auth-session";
import { getSessionUserId } from "@/lib/auth-session";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();


    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Nincs bejelentkezve." },
        { status: 401 }
      );
    }


    const { currentPassword, newPassword, logoutEverywhere } = await req.json();

    // 1) Validáció
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Minden mező kötelező." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8 || !/\d/.test(newPassword) || !/[a-zA-Z]/.test(newPassword)) {
      return NextResponse.json(
        {
          success: false,
          message: "A jelszónak legalább 8 karakteresnek kell lennie, és tartalmaznia kell számot és betűt.",
        },
        { status: 400 }
      );
    }

    // 2) User lekérése
    const [rows]: any = await db.query(
      "SELECT id, password_hash FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Felhasználó nem található." },
        { status: 404 }
      );
    }

    const user = rows[0];

    // 3) Jelenlegi jelszó ellenőrzése
    const valid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!valid) {
      return NextResponse.json(
        { success: false, message: "Hibás jelenlegi jelszó." },
        { status: 400 }
      );
    }

    // 4) Új jelszó hash-elése
    const hashed = await bcrypt.hash(newPassword, 12);

    // 5) Jelszó frissítése
    await db.query(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [hashed, userId]
    );

    // 6) Kijelentkeztetés minden eszközről (opcionális)
    if (logoutEverywhere) {
      await revokeAllUserSessions(userId);
      // Egyszerű megoldás: töröljük a session cookie-t
      const response = NextResponse.json({ success: true });
      clearSessionCookie(response);
      return response;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Password change error:", err);
    return NextResponse.json(
      { success: false, message: "Váratlan hiba történt." },
      { status: 500 }
    );
  }
}
