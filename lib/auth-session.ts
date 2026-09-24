import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { db } from "@/lib/db";

const COOKIE = "session_user";
const SESSION_SECONDS = 60 * 60 * 24;
const REMEMBER_SECONDS = 60 * 60 * 24 * 30;

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function createSession(userId: number, response: NextResponse, remember = false): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const maxAge = remember ? REMEMBER_SECONDS : SESSION_SECONDS;
  await db.query(
    "INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND))",
    [userId, digest(token), maxAge],
  );
  response.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function getSessionUserId(): Promise<number | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null; // Régi számszerű cookie SOHA nem érvényes.
  const [rows]: any = await db.query(
    `SELECT s.user_id FROM user_sessions s INNER JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP() LIMIT 1`,
    [digest(token)],
  );
  return rows.length ? Number(rows[0].user_id) : null;
}

export async function revokeCurrentSession(): Promise<void> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    await db.query("DELETE FROM user_sessions WHERE token_hash = ?", [digest(token)]);
  }
}

export async function revokeAllUserSessions(userId: number): Promise<void> {
  await db.query("DELETE FROM user_sessions WHERE user_id = ?", [userId]);
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
