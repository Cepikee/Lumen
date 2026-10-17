type RecaptchaVerificationOptions = {
  expectedAction?: string;
};

function configuredHostnames(): Set<string> {
  const values = [
    process.env.RECAPTCHA_ALLOWED_HOSTNAMES,
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
      // Invalid host configuration is ignored here. Production verification
      // fails closed below when no valid hostname remains.
    }
  }
  return hosts;
}

export async function verifyRecaptcha(token: unknown, options: RecaptchaVerificationOptions = {}) {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.UTOM_LOCAL_DEMO_CAPTCHA === "true" &&
    ["127.0.0.1", "localhost", "::1"].includes(String(process.env.DB_HOST)) &&
    process.env.DB_NAME === "utom_dev" &&
    token === "local-demo"
  ) {
    return 0.9;
  }

  if (process.env.UTOM_TEST_FIXTURE_MODE === "true") {
    const host = process.env.DB_HOST;
    if (!["127.0.0.1", "localhost", "::1"].includes(String(host)) || !String(process.env.DB_NAME).endsWith("_test")) {
      throw new Error("unsafe_test_fixture_configuration");
    }
    return Number(process.env.UTOM_TEST_RECAPTCHA_SCORE || 0);
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();
  const normalizedToken = typeof token === "string" ? token.trim() : "";
  if (!secret || !normalizedToken || normalizedToken.length > 4096) return 0;

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: normalizedToken }).toString(),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    if (!res.ok) return 0;
    const data: any = await res.json();
    if (!data?.success) return 0;

    if (options.expectedAction && data.action !== options.expectedAction) return 0;

    if (process.env.NODE_ENV === "production") {
      const allowedHosts = configuredHostnames();
      const hostname = typeof data.hostname === "string" ? data.hostname.trim().toLowerCase() : "";
      if (allowedHosts.size === 0 || !hostname || !allowedHosts.has(hostname)) return 0;
    }

    const score = Number(data.score);
    return Number.isFinite(score) && score >= 0 && score <= 1 ? score : 0;
  } catch {
    return 0;
  }
}
