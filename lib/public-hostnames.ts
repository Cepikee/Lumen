export function configuredPublicHostnames(providerSpecific?: string | null): Set<string> {
  const values = [
    providerSpecific,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.PUBLIC_APP_URL,
    process.env.UTOM_ALLOWED_ORIGIN,
  ].filter(Boolean).flatMap((value) => String(value).split(","));

  const hosts = new Set<string>();
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    try {
      const url = value.includes("://") ? new URL(value) : new URL(`https://${value}`);
      if (url.hostname) hosts.add(url.hostname.toLowerCase());
    } catch {
      // Invalid host config is ignored. Production verification fails closed
      // when no valid host remains.
    }
  }
  return hosts;
}
