import { getSessionUserId } from "@/lib/auth-session";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPremiumEntitlement } from "@/lib/entitlements";
import { requireTrustedOrigin } from "@/lib/security";
import { readJsonBodyWithLimit } from "@/lib/request-body";

export async function POST(req: Request) {
  const originDenied = requireTrustedOrigin(req);
  if (originDenied) return originDenied;

  const parsedBody = await readJsonBodyWithLimit(req, 8_000);
  if (!parsedBody.ok) {
    return NextResponse.json(
      { success: false, message: parsedBody.status === 413 ? "Túl nagy kérés." : "Érvénytelen kérés." },
      { status: parsedBody.status },
    );
  }
  const body = parsedBody.value;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ success: false, message: "Érvénytelen kérés." }, { status: 400 });
  }
  const { style, seed, format } = body as {
    style?: unknown;
    seed?: unknown;
    format?: unknown;
  };

  const allowedStyles = new Set([
    "adventurer", "adventurer-neutral", "avataaars", "big-ears",
    "big-ears-neutral", "big-smile", "bottts", "bottts-neutral",
    "croodles", "croodles-neutral", "open-peeps", "pixel-art", "personas",
  ]);
  if (
    typeof style !== "string" || !allowedStyles.has(style) ||
    typeof seed !== "string" || seed.length < 1 || seed.length > 128 ||
    (format !== "svg" && format !== "gif")
  ) {
    return NextResponse.json({ success: false, message: "Érvénytelen avatar adat." }, { status: 400 });
  }

  let userId: number | null;
  try {
    userId = await getSessionUserId();
  } catch (error) {
    console.error("Avatar session lookup error:", error);
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

  let entitlement;
  try {
    entitlement = await getPremiumEntitlement(userId);
  } catch (error) {
    console.error("Avatar entitlement lookup error:", error);
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

  if (format === "gif" && !entitlement.active) {
    return NextResponse.json(
      { success: false, message: "Animált avatar csak prémium felhasználóknak elérhető." },
      { status: 403 }
    );
  }

  try {
    await db.query(
      `UPDATE users
       SET avatar_style = ?, avatar_seed = ?, avatar_format = ?
       WHERE id = ?`,
      [style, seed, format, userId]
    );
  } catch (error) {
    console.error("Avatar update error:", error);
    return NextResponse.json(
      { success: false, message: "Váratlan hiba történt." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
