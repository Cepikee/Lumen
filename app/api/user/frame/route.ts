import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { PREMIUM_FRAMES } from "@/types/premiumFrames";

export async function POST(req: Request) {
  const body = await req.json();
  const { avatar_frame } = body as { avatar_frame: string };

  // 🔒 Session ellenőrzés
  const cookieStore = await cookies();
  const sessionUser = cookieStore.get("session_user");
  const userId = sessionUser?.value;

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Nincs bejelentkezett felhasználó." },
      { status: 401 }
    );
  }

  // 🔍 User lekérése
  const [rows]: any = await db.query(
    "SELECT is_premium, premium_until FROM users WHERE id = ? LIMIT 1",
    [userId]
  );

  if (!rows || rows.length === 0) {
    return NextResponse.json(
      { success: false, message: "Felhasználó nem található." },
      { status: 404 }
    );
  }

  const user = rows[0];

  // 🔥 Prémium státusz ellenőrzés
  const premiumActive =
    user.is_premium ||
    (user.premium_until && new Date(user.premium_until) > new Date());

  if (!premiumActive) {
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
