// /app/verify-email/page.tsx

"use client";

import { useEffect, useState } from "react";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Hiányzó token.");
      return;
    }

    async function verify() {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setMessage("Az email címed sikeresen megerősítve!");
      } else {
        setStatus("error");
        setMessage(data.message || "Ismeretlen hiba történt.");
      }
    }

    verify();
  }, []);

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      {status === "loading" && <h2>Ellenőrzés folyamatban...</h2>}
      {status === "success" && <h2 style={{ color: "green" }}>{message}</h2>}
      {status === "error" && <h2 style={{ color: "red" }}>{message}</h2>}
    </div>
  );
}
