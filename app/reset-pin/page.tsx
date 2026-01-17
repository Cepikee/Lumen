"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function ResetPinContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Hiányzó vagy érvénytelen token.");
    }
  }, [token]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setStatus("loading");
    setError("");

    if (!/^\d{4}$/.test(newPin)) {
      setError("A PIN kódnak pontosan 4 számjegyből kell állnia.");
      setStatus("idle");
      return;
    }

    if (newPin !== confirmPin) {
      setError("A két PIN kód nem egyezik.");
      setStatus("idle");
      return;
    }

    const res = await fetch("/api/auth/reset-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPin }),
    });

    const data = await res.json();

    if (data.success) {
      setStatus("success");
    } else {
      setStatus("error");
      setError(data.error || "Hiba történt.");
    }
  };

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "60px auto",
        padding: "20px",
        background: "#111",
        color: "white",
        borderRadius: "8px",
      }}
    >
      <h2 className="mb-3">PIN kód visszaállítása</h2>

      {status === "success" ? (
        <div>
          <p>A PIN kód sikeresen frissítve!</p>
          <a href="/" className="btn btn-success w-100 mt-3">
            Bejelentkezés
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            className="form-control mb-3"
            placeholder="Új PIN (4 szám)"
            type="password"
            maxLength={4}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            required
          />

          <input
            className="form-control mb-3"
            placeholder="Új PIN megerősítése"
            type="password"
            maxLength={4}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            required
          />

          {error && <div className="text-danger mb-3">{error}</div>}

          <button
            className="btn btn-primary w-100"
            type="submit"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Mentés..." : "PIN frissítése"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPinPage() {
  return (
    <Suspense fallback={<div className="text-center mt-5">Betöltés...</div>}>
      <ResetPinContent />
    </Suspense>
  );
}
