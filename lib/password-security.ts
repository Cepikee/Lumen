import bcrypt from "bcryptjs";

export const PASSWORD_BCRYPT_COST = 12;
const SUPPORTED_LOGIN_COSTS = [10, PASSWORD_BCRYPT_COST] as const;
// Precompute both historical work factors when this server module loads. This
// avoids making the first request's timing depend on whether an account exists.
const DUMMY_PASSWORD_HASHES = new Map<number, string>([
  [10, bcrypt.hashSync("utom-login-dummy-10-A1", 10)],
  [PASSWORD_BCRYPT_COST, bcrypt.hashSync("utom-login-dummy-12-A1", PASSWORD_BCRYPT_COST)],
]);

function getDummyHash(cost: number): string {
  const hash = DUMMY_PASSWORD_HASHES.get(cost);
  if (!hash) throw new Error("unsupported_dummy_bcrypt_cost");
  return hash;
}

export function bcryptCost(hash: unknown): number | null {
  if (typeof hash !== "string") return null;
  const match = /^\$2[aby]\$(\d\d)\$/.exec(hash);
  if (!match) return null;
  const cost = Number(match[1]);
  return Number.isInteger(cost) ? cost : null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_BCRYPT_COST);
}

/**
 * Verifies a password while doing comparable bcrypt work for missing accounts
 * and for the two password costs that have existed in UTOM production (10/12).
 * This is not a generic constant-time primitive, but it removes the practical
 * account-existence timing oracle caused by a single mismatched dummy hash.
 */
export async function verifyPasswordWithTimingPadding(password: string, storedHash: unknown): Promise<boolean> {
  const stored = typeof storedHash === "string" ? storedHash : null;
  const storedCost = bcryptCost(stored);

  if (stored && SUPPORTED_LOGIN_COSTS.includes(storedCost as 10 | 12)) {
    const valid = await bcrypt.compare(password, stored);
    const paddingCost = storedCost === 10 ? PASSWORD_BCRYPT_COST : 10;
    await bcrypt.compare(password, getDummyHash(paddingCost));
    return valid;
  }

  if (!stored) {
    for (const cost of SUPPORTED_LOGIN_COSTS) {
      await bcrypt.compare(password, getDummyHash(cost));
    }
    return false;
  }

  // Unknown legacy cost: verify it, then add the normal two-cost padding.
  // This path is intentionally conservative; successful login can migrate the
  // hash to PASSWORD_BCRYPT_COST afterwards.
  const valid = await bcrypt.compare(password, stored);
  for (const cost of SUPPORTED_LOGIN_COSTS) {
    await bcrypt.compare(password, getDummyHash(cost));
  }
  return valid;
}

export function passwordNeedsRehash(storedHash: unknown): boolean {
  return bcryptCost(storedHash) !== PASSWORD_BCRYPT_COST;
}
