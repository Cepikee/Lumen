"use client";

import { useEffect, useState } from "react";
import { User } from "@/types/User";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
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
          setUser(data.user as User);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth error:", err);
        setUser(null);
      }

      setLoading(false);
    }

    load();
  }, []);

  return { user, loading };
}
