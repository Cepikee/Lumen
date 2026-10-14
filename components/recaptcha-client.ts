// Execute in a disposable browsing context: its badge and globals disappear
// after the protected action obtains a token. No site-wide script or CSS hiding.
let pendingToken: Promise<string> | null = null;
export async function getRecaptchaToken(action: string): Promise<string> {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();
  if (!siteKey && process.env.NEXT_PUBLIC_LOCAL_DEMO_CAPTCHA === "true") return "local-demo";
  if (!siteKey || typeof window === "undefined") throw new Error("recaptcha_unavailable");
  if (pendingToken) throw new Error("recaptcha_busy");
  pendingToken = new Promise<string>((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.title = "reCAPTCHA botvédelem";
    Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "310px", height: "100px", border: "0", zIndex: "2147483647" });
    let finished = false;
    const finish = (error?: Error, token?: string) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      frame.remove();
      if (error) reject(error); else resolve(token!);
    };
    const timer = setTimeout(() => finish(new Error("recaptcha_timeout")), 20000);
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) { finish(new Error("recaptcha_unavailable")); return; }
    const script = doc.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.onerror = () => finish(new Error("recaptcha_unavailable"));
    script.onload = () => {
      const api = (frame.contentWindow as (Window & { grecaptcha?: { ready: (callback: () => void) => void; execute: (key: string, options: { action: string }) => Promise<string> } }) | null)?.grecaptcha;
      if (!api) { finish(new Error("recaptcha_unavailable")); return; }
      api.ready(() => {
        if (finished) return;
        api.execute(siteKey, { action }).then(token => {
          if (!token) finish(new Error("recaptcha_empty_token")); else finish(undefined, token);
        }).catch(() => finish(new Error("recaptcha_unavailable")));
      });
    };
    doc.head.appendChild(script);
  });
  try { return await pendingToken; } finally { pendingToken = null; }
}
