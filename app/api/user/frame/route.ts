import { getSessionUserId } from "@/lib/auth-session";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PREMIUM_FRAMES } from "@/types/premiumFrames";
import { getPremiumEntitlement } from "@/lib/entitlements";

export async function POST(req: Request) {
  const body = await req.json();
  const { avatar_frame } = body as { avatar_frame: string };

  // 🔒 Session ellenőrzés
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Nincs bejelentkezett felhasználó." },
      { status: 401 }
    );
  }

  // 🔍 User lekérése
  const entitlement = await getPremiumEntitlement(userId);
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
  const valid = PREMIUM_FRAMES.some((f) => f.id === avatar_frame);

  if (!valid) {
    return NextResponse.json(
      { success: false, message: "Érvénytelen keret." },
      { status: 400 }
    );
  }

  // 💾 Mentés adatbázisba
  await db.query(
    `UPDATE users 
     SET avatar_frame = ?
     WHERE id = ?`,
    [avatar_frame, userId]
  );

  return NextResponse.json({ success: true });
}
