"use client";

import { useEffect, useState } from "react";

export function useUser() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json();
        if (data.loggedIn) {
          setUser(data.user);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }

      setLoading(false);
    }

    load();
  }, []);

  return { user, loading };
}
