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
    }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Érvénytelen kérés." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ success: false, message: "Érvénytelen kérés." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;

  // Engedélyezett mezők (később bővíthető)
  // A felhasználónév módosítása kizárólag a cooldown/uniqueness ellenőrzést
  // végző /api/auth/username-reset útvonalon történhet.
  const allowedFields = ["theme", "bio"] as const;

  // Csak azokat vesszük át, amik engedélyezettek
  const updates: Record<string, string> = {};

  for (const key of Object.keys(input)) {
    if ((allowedFields as readonly string[]).includes(key)) {
      const value = input[key];
      if (typeof value !== "string") continue;
      updates[key] = value;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({
      success: false,
      message: "Nincs frissíthető mező."
    }, { status: 400 });
  }

  if (updates.theme !== undefined && !["light", "dark", "system"].includes(updates.theme)) {
    return NextResponse.json({ success: false, message: "Érvénytelen téma." }, { status: 400 });
  }
  if (updates.bio && updates.bio.length > 1000) {
    return NextResponse.json({ success: false, message: "A bemutatkozás túl hosszú." }, { status: 400 });
  }

  // SQL SET rész dinamikusan
  const setSql = Object.keys(updates)
    .map((key) => `${key} = ?`)
    .join(", ");

  const values = Object.values(updates);

  try {
    await db.query(
      `UPDATE users SET ${setSql} WHERE id = ?`,
      [...values, userId]
    );
  } catch (error) {
    console.error("User update error:", error);
    return NextResponse.json(
      { success: false, message: "Váratlan hiba történt." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Profil frissítve.",
    updated: Object.keys(updates)
  });
}
