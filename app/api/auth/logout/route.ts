import { NextResponse } from "next/server";
import { revokeCurrentSession, clearSessionCookie } from "@/lib/auth-session";

export async function POST() {
  try {
    await revokeCurrentSession();
    const response = NextResponse.json({ success: true });
    clearSessionCookie(response);
    return response;
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
