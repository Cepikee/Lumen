import { NextResponse } from "next/server";
import { revokeCurrentSession, clearSessionCookie } from "@/lib/auth-session";
import { requireTrustedOrigin } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const originDenied = requireTrustedOrigin(req);
    if (originDenied) return originDenied;
    await revokeCurrentSession();
    const response = NextResponse.json({ success: true });
    clearSessionCookie(response);
    return response;
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
