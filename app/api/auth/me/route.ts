import { getSessionUserId } from "@/lib/auth-session";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { evaluatePremium } from "@/lib/entitlements";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId();

    if (!userId) {
      return NextResponse.json({ loggedIn: false });
    }


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

    const entitlement = evaluatePremium(user);
    return NextResponse.json({
      loggedIn: true,
      user: {
        ...user,
        isPremium: entitlement.active,
      },
    });
  } catch {
    return NextResponse.json({ loggedIn: false });
  }
}
