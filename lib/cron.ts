/**
 * Deprecated scheduler retained as a compatibility symbol.
 * The only canonical article processor is pipeline/cron.js.
 */
export function startLegacyCron(): never {
  throw new Error(
    "legacy_cron_disabled: use the canonical pipeline/cron.js worker",
  );
}
