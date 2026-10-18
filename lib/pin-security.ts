import { timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { validatePin } from "@/lib/auth-policy";

const PIN_BCRYPT_COST = 12;
// Module-load precomputation keeps the first login request from having a
// missing-account-only bcrypt hash setup cost.
const DUMMY_PIN_HASH = bcrypt.hashSync("0000", PIN_BCRYPT_COST);

export function isHashedPin(value: unknown): value is string {
  return typeof value === "string" && /^\$2[aby]\$/.test(value);
}

export async function hashPin(pin: string): Promise<string> {
  if (!validatePin(pin)) throw new Error("invalid_pin");
  return bcrypt.hash(pin, PIN_BCRYPT_COST);
}

export async function verifyPin(pin: unknown, stored: unknown): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (!validatePin(pin) || typeof stored !== "string") return { valid: false, needsUpgrade: false };
  if (isHashedPin(stored)) return { valid: await bcrypt.compare(pin, stored), needsUpgrade: false };

  const supplied = Buffer.from(pin, "utf8");
  const legacy = Buffer.from(stored, "utf8");
  const valid = supplied.length === legacy.length && timingSafeEqual(supplied, legacy);
  return { valid, needsUpgrade: valid };
}

/**
 * Login-specific verification that always performs one cost-12 bcrypt PIN
 * operation, even for missing accounts and legacy plaintext PIN rows. This
 * prevents the password/PIN stages from becoming a useful response-time oracle.
 */
export async function verifyPinWithTimingPadding(
  pin: unknown,
  stored: unknown,
): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  const candidate = validatePin(pin) ? String(pin) : "0000";

  if (isHashedPin(stored)) {
    const compared = await bcrypt.compare(candidate, stored);
    return { valid: validatePin(pin) && compared, needsUpgrade: false };
  }

  const dummyResult = await bcrypt.compare(candidate, DUMMY_PIN_HASH);
  void dummyResult;

  if (!validatePin(pin) || typeof stored !== "string") return { valid: false, needsUpgrade: false };
  const supplied = Buffer.from(String(pin), "utf8");
  const legacy = Buffer.from(stored, "utf8");
  const valid = supplied.length === legacy.length && timingSafeEqual(supplied, legacy);
  return { valid, needsUpgrade: valid };
}
