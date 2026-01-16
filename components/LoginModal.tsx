"use client";

import { useState } from "react";

export default function LoginModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");

  const handleLogin = async () => {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, pin }),
  });

  const data = await res.json();

  if (data.success) {
    // 🔥 AUTOMATIKUS FRISSÍTÉS LOGIN UTÁN
    window.location.reload();
  } else {
    alert(data.message || "Hibás adatok.");
  }
};


  return (
    <>
      {/* 🔥 EZ A GOMB LÁTSZIK A HEADERBEN */}
      <button
        className="btn btn-outline-primary"
        onClick={() => setOpen(true)}
      >
        Bejelentkezés
      </button>

      {/* 🔥 MODAL – csak akkor látszik, ha open = true */}
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
            <h3 className="mb-3">Bejelentkezés</h3>

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
              placeholder="PIN (1-4 szám)"
              type="number"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />

            <button className="btn btn-success w-100" onClick={handleLogin}>
              Belépés
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
