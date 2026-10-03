"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setStatus("error");
      setError("Hiányzó vagy érvénytelen token.");
      return;
    }
    setStatus("loading");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const text = await res.text();
      let data: { success?: boolean; error?: string } = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

      if (!res.ok || data.success !== true) {
        setStatus("error");
        setError(data.error || `A jelszó frissítése nem sikerült (${res.status}).`);
        return;
      }
      setStatus("success");
      setTimeout(() => {
        window.location.href = "/?resetSuccess=1";
      }, 2000);
    } catch {
      setStatus("error");
      setError("A jelszó frissítése nem sikerült. Ellenőrizd a kapcsolatot.");
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "50px auto" }}>
      <h2>Új jelszó beállítása</h2>

      {status === "error" && <p style={{ color: "red" }}>{error}</p>}
      {status === "success" && (
        <p style={{ color: "green" }}>
          A jelszó sikeresen frissült! Átirányítás...
        </p>
      )}

      {status !== "success" && (
        <form onSubmit={handleSubmit}>
          <label>Új jelszó</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: 8, marginTop: 8, marginBottom: 16 }}
          />

          <button
            type="submit"
            disabled={status === "loading" || !token}
            style={{ width: "100%", padding: 10 }}
          >
            {status === "loading" ? "Mentés..." : "Jelszó frissítése"}
          </button>
        </form>
      )}
    </div>
  );
}
