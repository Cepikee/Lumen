import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const cookieStore = await cookies(); // <-- KELL az await
  const session = cookieStore.get("session_user");

  if (!session) {
    return NextResponse.json({
      success: false,
      message: "Nincs bejelentkezve."
    });
  }

  const userId = Number(session.value);
  const body = await req.json();

  // Engedélyezett mezők (később bővíthető)
  const allowedFields = ["theme", "nickname", "bio", "avatar", "pin", "password"];

  // Csak azokat vesszük át, amik engedélyezettek
  const updates: Record<string, any> = {};

  for (const key of Object.keys(body)) {
    if (allowedFields.includes(key)) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({
      success: false,
      message: "Nincs frissíthető mező."
    });
  }

  // SQL SET rész dinamikusan
  const setSql = Object.keys(updates)
    .map((key) => `${key} = ?`)
    .join(", ");

  const values = Object.values(updates);

  await db.query(
    `UPDATE users SET ${setSql} WHERE id = ?`,
    [...values, userId]
  );

  return NextResponse.json({
    success: true,
    message: "Profil frissítve.",
    updated: updates
  });
}
