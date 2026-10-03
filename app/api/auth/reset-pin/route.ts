import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validatePin } from "@/lib/auth-policy";
import { hashPin } from "@/lib/pin-security";
import { hashOneTimeToken } from "@/lib/one-time-token";

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Érvénytelen JSON kérés." }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: "Érvénytelen kérés törzs." }, { status: 400 });
    }
    const { token, newPin } = body as { token?: unknown; newPin?: unknown };

    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token) || !newPin) {
      return NextResponse.json(
        { success: false, error: "Hiányzó adatok." },
        { status: 400 }
      );
    }

    // 🔥 1) PIN validáció
    if (!validatePin(newPin)) {
      return NextResponse.json(
        { success: false, error: "A PIN kódnak 4 számjegyből kell állnia." },
        { status: 400 }
      );
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [rows]: any = await connection.query(
        "SELECT id, userId, expiresAt, expiresAt > UTC_TIMESTAMP() AS is_valid FROM pin_reset_tokens WHERE token = ? LIMIT 1 FOR UPDATE",
        [hashOneTimeToken(token)],
      );

    if (!rows || rows.length === 0) {
        await connection.rollback();
        return NextResponse.json(
        { success: false, error: "Érvénytelen vagy lejárt token." },
        { status: 400 }
      );
    }

    const { userId, is_valid: isValid } = rows[0];

    // 🔥 3) Token lejárati idő ellenőrzése
    if (!Number(isValid)) {
        await connection.query("DELETE FROM pin_reset_tokens WHERE id = ?", [rows[0].id]);
        await connection.commit();
        return NextResponse.json(
        { success: false, error: "A token lejárt." },
        { status: 400 }
      );
    }

    // 🔥 4) PIN frissítése
      const [updateResult]: any = await connection.query(
      "UPDATE users SET pin_code = ? WHERE id = ?",
      [await hashPin(newPin), userId]
    );
      if (updateResult?.affectedRows !== 1) {
        await connection.rollback();
        return NextResponse.json({ success: false, error: "A felhasználó nem található." }, { status: 404 });
      }

    // 🔥 5) Token törlése
      await connection.query("DELETE FROM pin_reset_tokens WHERE id = ?", [rows[0].id]);
      await connection.query("DELETE FROM user_sessions WHERE user_id = ?", [userId]);
      await connection.commit();

      return NextResponse.json({ success: true });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error: any) {
    console.error("pin_reset_failed");
    return NextResponse.json(
      { success: false, error: "Váratlan hiba történt." },
      { status: 500 }
    );
  }
}
