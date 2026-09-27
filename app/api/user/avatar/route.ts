import { getSessionUserId } from "@/lib/auth-session";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPremiumEntitlement } from "@/lib/entitlements";

export async function POST(req: Request) {
  const body = await req.json();
  const { style, seed, format } = body as {
    style: string;
    seed: string;
    format: "svg" | "gif";
  };

  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Nincs bejelentkezett felhasználó." },
      { status: 401 }
    );
  }

  const entitlement = await getPremiumEntitlement(userId);
  if (entitlement.reason === "user_not_found") {
    return NextResponse.json(
      { success: false, message: "Felhasználó nem található." },
      { status: 404 }
    );
  }

  if (format === "gif" && !entitlement.active) {
    return NextResponse.json(
      { success: false, message: "Animált avatar csak prémium felhasználóknak elérhető." },
      { status: 403 }
    );
  }

  await db.query(
    `UPDATE users 
     SET avatar_style = ?, avatar_seed = ?, avatar_format = ?
     WHERE id = ?`,
    [style, seed, format, userId]
  );

  return NextResponse.json({ success: true });
}
