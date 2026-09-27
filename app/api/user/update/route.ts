import { getSessionUserId } from "@/lib/auth-session";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTrustedOrigin } from "@/lib/security";

export async function POST(req: Request) {
  const originDenied = requireTrustedOrigin(req);
  if (originDenied) return originDenied;
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({
      success: false,
      message: "Nincs bejelentkezve."
    });
  }

  const body = await req.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ success: false, message: "Érvénytelen kérés." }, { status: 400 });
  }

  // Engedélyezett mezők (később bővíthető)
  const allowedFields = ["theme", "nickname", "bio"] as const;

  // Csak azokat vesszük át, amik engedélyezettek
  const updates: Record<string, string | null> = {};

  for (const key of Object.keys(body)) {
    if ((allowedFields as readonly string[]).includes(key)) {
      const value = body[key];
      if (value !== null && typeof value !== "string") continue;
      updates[key] = value;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({
      success: false,
      message: "Nincs frissíthető mező."
    });
  }

  if (updates.theme && !["light", "dark", "system"].includes(updates.theme)) {
    return NextResponse.json({ success: false, message: "Érvénytelen téma." }, { status: 400 });
  }
  if (updates.nickname && !/^[a-zA-Z0-9_]{3,20}$/.test(updates.nickname)) {
    return NextResponse.json({ success: false, message: "Érvénytelen felhasználónév." }, { status: 400 });
  }
  if (updates.bio && updates.bio.length > 1000) {
    return NextResponse.json({ success: false, message: "A bemutatkozás túl hosszú." }, { status: 400 });
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
    updated: Object.keys(updates)
  });
}
