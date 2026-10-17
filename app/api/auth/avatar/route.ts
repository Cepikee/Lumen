import { getSessionUserId } from "@/lib/auth-session";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPremiumEntitlement } from "@/lib/entitlements";
import { requireTrustedOrigin } from "@/lib/security";
import { readJsonBodyWithLimit } from "@/lib/request-body";

export async function POST(req: Request) {
  const originDenied = requireTrustedOrigin(req);
  if (originDenied) return originDenied;

  try {
    const userId = await getSessionUserId();

    if (!userId) {
      return NextResponse.json({ success: false, message: "Not logged in" }, { status: 401 });
    }


    const parsedBody = await readJsonBodyWithLimit(req, 8_000);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { success: false, message: parsedBody.status === 413 ? "Request too large" : "Invalid JSON" },
        { status: parsedBody.status },
      );
    }
    const body = parsedBody.value;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
    }
    const { style, seed, format } = body as { style?: unknown; seed?: unknown; format?: unknown };

    const allowedStyles = new Set([
      "adventurer", "adventurer-neutral", "avataaars", "big-ears",
      "big-ears-neutral", "big-smile", "bottts", "bottts-neutral",
      "croodles", "croodles-neutral", "open-peeps", "pixel-art", "personas",
    ]);
    if (
      typeof style !== "string" || !allowedStyles.has(style) ||
      typeof seed !== "string" || seed.trim().length < 1 || seed.length > 128 ||
      (format !== "svg" && format !== "gif")
    ) {
      return NextResponse.json({
        success: false,
        message: "Invalid avatar data",
      }, { status: 400 });
    }

    const entitlement = await getPremiumEntitlement(userId);
    if (entitlement.reason === "user_not_found") {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }
    if (format === "gif" && !entitlement.active) {
      return NextResponse.json({
        success: false,
        message: "Animated avatars require premium access",
      }, { status: 403 });
    }

    // 🔥 Avatar mentése az adatbázisba
    await db.query(
      `UPDATE users 
       SET avatar_style = ?, avatar_seed = ?, avatar_format = ?
       WHERE id = ?`,
      [style, seed, format, userId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({
      success: false,
      message: "Server error",
    }, { status: 500 });
  }
}
