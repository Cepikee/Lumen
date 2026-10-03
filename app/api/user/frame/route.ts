import { getSessionUserId } from "@/lib/auth-session";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PREMIUM_FRAMES } from "@/types/premiumFrames";
import { getPremiumEntitlement } from "@/lib/entitlements";

export async function POST(req: Request) {
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
  const { avatar_frame } = body as { avatar_frame?: unknown };

  // 🔒 Session ellenőrzés
  let userId: number | null;
  try {
    userId = await getSessionUserId();
  } catch (error) {
    console.error("Frame session lookup error:", error);
    return NextResponse.json(
      { success: false, message: "Váratlan hiba történt." },
      { status: 500 }
    );
  }

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Nincs bejelentkezett felhasználó." },
      { status: 401 }
    );
  }

  // 🔍 User lekérése
  let entitlement;
  try {
    entitlement = await getPremiumEntitlement(userId);
  } catch (error) {
    console.error("Frame entitlement lookup error:", error);
    return NextResponse.json(
      { success: false, message: "Váratlan hiba történt." },
      { status: 500 }
    );
  }
  if (entitlement.reason === "user_not_found") {
    return NextResponse.json(
      { success: false, message: "Felhasználó nem található." },
      { status: 404 }
    );
  }

  if (!entitlement.active) {
    return NextResponse.json(
      { success: false, message: "A prémium keretek csak prémium felhasználóknak elérhetők." },
      { status: 403 }
    );
  }

  // 🔍 Valid keret?
  const valid = typeof avatar_frame === "string" && PREMIUM_FRAMES.some((f) => f.id === avatar_frame);

  if (!valid) {
    return NextResponse.json(
      { success: false, message: "Érvénytelen keret." },
      { status: 400 }
    );
  }

  // 💾 Mentés adatbázisba
  try {
    await db.query(
      `UPDATE users
       SET avatar_frame = ?
       WHERE id = ?`,
      [avatar_frame, userId]
    );
  } catch (error) {
    console.error("Frame update error:", error);
    return NextResponse.json(
      { success: false, message: "Váratlan hiba történt." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
