export async function getRecaptchaToken(action: string): Promise<string> {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();
  if (!siteKey && process.env.NEXT_PUBLIC_LOCAL_DEMO_CAPTCHA === "true") return "local-demo";
  if (!siteKey || typeof window === "undefined" || typeof window.grecaptcha?.execute !== "function") {
    throw new Error("recaptcha_unavailable");
  }
  return window.grecaptcha.execute(siteKey, { action });
}
