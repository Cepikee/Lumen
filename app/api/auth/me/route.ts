import { getSessionUserId } from "@/lib/auth-session";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { evaluatePremium } from "@/lib/entitlements";

const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

function authJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_NO_STORE });
}

export async function GET(_req: Request) {
  try {
    const userId = await getSessionUserId();

    if (!userId) return authJson({ loggedIn: false });

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

    if (rows.length === 0) return authJson({ loggedIn: false });

    const user = rows[0];
    const entitlement = evaluatePremium(user);
    return authJson({
      loggedIn: true,
      user: {
        ...user,
        isPremium: entitlement.active,
      },
    });
  } catch {
    return authJson({ loggedIn: false, error: "auth_state_unavailable" }, 500);
  }
}
