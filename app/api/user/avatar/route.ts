import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const body = await req.json();
  const { style, seed, format } = body as {
    style: string;
    seed: string;
    format: "svg" | "gif";
  };

  const cookieStore = await cookies();
  const sessionUser = cookieStore.get("session_user");
  const userId = sessionUser?.value;

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Nincs bejelentkezett felhasználó." },
      { status: 401 }
    );
  }

  const [rows]: any = await db.query("SELECT is_premium, premium_until FROM users WHERE id = ? LIMIT 1", [
    userId,
  ]);

  if (!rows || rows.length === 0) {
    return NextResponse.json(
      { success: false, message: "Felhasználó nem található." },
      { status: 404 }
    );
  }

  const user = rows[0];
  const premiumActive =
    user.is_premium ||
    (user.premium_until && new Date(user.premium_until) > new Date());

  if (format === "gif" && !premiumActive) {
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
