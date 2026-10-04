export async function verifyRecaptcha(token: string) {
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
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret || !token) return 0;

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${secret}&response=${token}`,
  });

  const data = await res.json();

  if (!data.success) return 0;
  return data.score as number; // 0.0–1.0
}
