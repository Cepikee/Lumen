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
    setStatus("loading");

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();

    if (data.success) {
      setStatus("success");
      setTimeout(() => {
        window.location.href = "/?resetSuccess=1";
      }, 2000);
    } else {
      setStatus("error");
      setError(data.error || "Ismeretlen hiba.");
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
            disabled={status === "loading"}
            style={{ width: "100%", padding: 10 }}
          >
            {status === "loading" ? "Mentés..." : "Jelszó frissítése"}
          </button>
        </form>
      )}
    </div>
  );
}
