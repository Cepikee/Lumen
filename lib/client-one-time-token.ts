"use client";

/**
 * Reads a one-time token from the URL fragment (preferred) or the legacy query
 * string, then immediately removes it from browser history/address bar.
 */
export function readAndScrubOneTimeToken(): string | null {
  if (typeof window === "undefined") return null;

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  const token = hashParams.get("token") || searchParams.get("token");

  if (token) {
    const clean = `${window.location.pathname}`;
    window.history.replaceState(window.history.state, "", clean);
  }
  return token;
}
