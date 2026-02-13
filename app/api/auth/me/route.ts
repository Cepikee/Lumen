import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/session_user=([^;]+)/);

    if (!match) {
      return NextResponse.json({ loggedIn: false });
    }

    const userId = match[1];

    const [rows]: any = await db.query(
      `SELECT 
          id,
          email,
          nickname,
          created_at,
          email_verified,
          last_login,
          role,
          theme,
          bio,
          is_premium,
          premium_until,
          premium_tier,
          avatar_style,
          avatar_seed,
          avatar_format,
          username_changed_at,
          avatar_frame
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ loggedIn: false });
    }

    const user = rows[0];

    return NextResponse.json({
      loggedIn: true,
      user: {
        ...user,
        isPremium: user.is_premium === 1,
      },
    });
  } catch {
    return NextResponse.json({ loggedIn: false });
  }
}
