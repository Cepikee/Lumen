"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const GA_ID = "G-TZ5DTR2N2S";
const CONSENT_KEY = "cookie-consent";
const SENSITIVE_PREFIXES = ["/reset-password", "/reset-pin", "/verify-email"];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

export default function Analytics({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const readConsent = () => setConsented(localStorage.getItem(CONSENT_KEY) === "accepted");
    readConsent();
    window.addEventListener("storage", readConsent);
    window.addEventListener("utom:cookie-consent", readConsent);
    return () => {
      window.removeEventListener("storage", readConsent);
      window.removeEventListener("utom:cookie-consent", readConsent);
    };
  }, []);

  useEffect(() => {
    window[`ga-disable-${GA_ID}`] = !consented;
    if (!enabled || !consented || !pathname || SENSITIVE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;

    window.dataLayer = window.dataLayer || [];
    const gtag = window.gtag || function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };
    window.gtag = gtag;

    const existing = document.querySelector<HTMLScriptElement>(`script[data-utom-ga="${GA_ID}"]`);
    if (!existing) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
      script.dataset.utomGa = GA_ID;
      document.head.appendChild(script);
      gtag("js", new Date());
    }

    // Never include query strings here: reset/verification secrets live in ?token=.
    gtag("config", GA_ID, {
      page_location: `${window.location.origin}${pathname}`,
      page_path: pathname,
    });
  }, [consented, enabled, pathname]);

  return null;
}
