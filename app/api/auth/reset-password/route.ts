import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { validatePassword } from "@/lib/auth-policy";
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
    const { token, password } = body as { token?: unknown; password?: unknown };

    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token) || typeof password !== "string" || !password) {
      return NextResponse.json({ success: false, error: "Missing token or password" }, { status: 400 });
    }

    const passwordPolicy = validatePassword(password);
    if (!passwordPolicy.valid) {
      return NextResponse.json({ success: false, error: passwordPolicy.message }, { status: 400 });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [rows]: any = await connection.query(
        "SELECT id, userId, expiresAt, expiresAt > UTC_TIMESTAMP() AS is_valid FROM password_reset_tokens WHERE token = ? LIMIT 1 FOR UPDATE",
        [hashOneTimeToken(token)],
      );

    if (!rows || rows.length === 0) {
        await connection.rollback();
        return NextResponse.json({ success: false, error: "Invalid or expired token" }, { status: 400 });
    }

    const resetToken = rows[0];

    // 2) Lejárati idő ellenőrzése
    if (!Number(resetToken.is_valid)) {
        await connection.query("DELETE FROM password_reset_tokens WHERE id = ?", [resetToken.id]);
        await connection.commit();
        return NextResponse.json({ success: false, error: "Token expired" }, { status: 400 });
    }

    const userId = resetToken.userId;

    // 3) Jelszó hashelése
    const hashed = await bcrypt.hash(password, 12);

    // 4) Jelszó frissítése a users táblában
      const [updateResult]: any = await connection.query("UPDATE users SET password_hash = ? WHERE id = ?", [hashed, userId]);
      if (updateResult?.affectedRows !== 1) {
        await connection.rollback();
        return NextResponse.json({ success: false, error: "A felhasználó nem található." }, { status: 404 });
      }

    // 5) Token törlése
      await connection.query("DELETE FROM password_reset_tokens WHERE id = ?", [resetToken.id]);
      await connection.query("DELETE FROM user_sessions WHERE user_id = ?", [userId]);
      await connection.commit();

      return NextResponse.json({ success: true, redirect: "/?resetSuccess=1" });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch {
    return NextResponse.json({ success: false, error: "Váratlan hiba történt." }, { status: 500 });
  }
}
