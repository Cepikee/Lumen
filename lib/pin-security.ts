import { timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { validatePin } from "@/lib/auth-policy";

export function isHashedPin(value: unknown): value is string {
  return typeof value === "string" && /^\$2[aby]\$/.test(value);
}

export async function hashPin(pin: string): Promise<string> {
  if (!validatePin(pin)) throw new Error("invalid_pin");
  return bcrypt.hash(pin, 12);
}

export async function verifyPin(pin: unknown, stored: unknown): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (!validatePin(pin) || typeof stored !== "string") return { valid: false, needsUpgrade: false };
  if (isHashedPin(stored)) return { valid: await bcrypt.compare(pin, stored), needsUpgrade: false };

  const supplied = Buffer.from(pin, "utf8");
  const legacy = Buffer.from(stored, "utf8");
  const valid = supplied.length === legacy.length && timingSafeEqual(supplied, legacy);
  return { valid, needsUpgrade: valid };
}
