"use client";

import { useState } from "react";

export default function RegisterModal() {
  const [open, setOpen] = useState(false);

  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, pin, nickname }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      alert("Sikeres regisztráció!");
      setOpen(false);
      setEmail("");
      setPassword("");
      setPin("");
      setNickname("");
    } else {
      setError(data.message || "Hiba történt.");
    }
  };

  return (
    <>
      {/* GOMB A HEADERHEZ */}
      <button
        className="btn btn-outline-secondary ms-3"
        onClick={() => setOpen(true)}
      >
        Regisztráció
      </button>

      {/* MODAL */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-dark text-white p-4 rounded"
            style={{ width: "350px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3">Regisztráció</h3>

            {/* HIBAÜZENET */}
            {error && (
              <div className="alert alert-danger py-2">{error}</div>
            )}

            <input
              className="form-control mb-2"
              placeholder="Felhasználónév (nickname)"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />

            <input
              className="form-control mb-2"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="form-control mb-2"
              placeholder="Jelszó"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <input
              className="form-control mb-3"
              placeholder="PIN (4 számjegy)"
              type="number"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />

            <button
              className="btn btn-success w-100"
              onClick={handleRegister}
              disabled={loading}
            >
              {loading ? "Feldolgozás…" : "Regisztráció"}
            </button>

            <button
              className="btn btn-secondary w-100 mt-2"
              onClick={() => setOpen(false)}
            >
              Bezárás
            </button>
          </div>
        </div>
      )}
    </>
  );
}
