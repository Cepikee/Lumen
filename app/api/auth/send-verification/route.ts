import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { getSessionUserId } from "@/lib/auth-session";
import { sendEmailVerification } from "@/lib/email-verification";

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ success: false, message: "Nincs bejelentkezve" }, { status: 401 });

    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT email FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    const user = rows[0];

    if (!user) {
      return NextResponse.json({ success: false, message: "User nem található" });
    }

    await sendEmailVerification(userId, String(user.email));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({
      success: false,
      message: "Hiba történt a token generálásakor.",
    });
  }
}
