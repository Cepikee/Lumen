"use client";

import { useState } from "react";

export default function RegisterModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordChecks = {
    length: password.length >= 8,
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    uppercase: /[A-Z]/.test(password),
  };

  const handleRegister = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          pin,
          nickname,
          bio,
        }),
      });

      const text = await res.text();
      if (!text) {
        setError("A szerver nem adott választ.");
        return;
      }

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        setError("A szerver hibás választ adott.");
        return;
      }

      if (res.ok && data?.success === true) {
        alert("Sikeres regisztráció!");
        onClose();
        // The API creates the session cookie, but the header/store was already
        // loaded before this modal opened. Reload so the new session is
        // reflected immediately instead of leaving the user on the logged-out UI.
        window.location.reload();
      } else {
        setError(data?.message || "Hiba történt.");
      }
    } catch {
      setError("A regisztrációs szolgáltatás jelenleg nem érhető el.");
    } finally {
      setLoading(false);
    }
  };

  return (
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
      onClick={onClose}
    >
      <div
        className="bg-dark text-white p-4 rounded position-relative"
        style={{ width: "380px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "transparent",
            border: "none",
            color: "white",
            fontSize: "22px",
            cursor: "pointer",
          }}
        >
          ×
        </button>

        <h3 className="mb-3">Regisztráció</h3>

        {error && <div className="alert alert-danger py-2">{error}</div>}

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

        <textarea
          className="form-control mb-2"
          placeholder="Bio (rövid bemutatkozás)"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={2}
        />

        <input
          className="form-control mb-2"
          placeholder="Jelszó"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="bg-secondary p-2 rounded mb-3" style={{ fontSize: "14px" }}>
          <div style={{ color: passwordChecks.length ? "#4caf50" : "#ff5252" }}>
            {passwordChecks.length ? "✔" : "✖"} Minimum 8 karakter
          </div>
          <div style={{ color: passwordChecks.number ? "#4caf50" : "#ff5252" }}>
            {passwordChecks.number ? "✔" : "✖"} Tartalmaz számot
          </div>
          <div style={{ color: passwordChecks.uppercase ? "#4caf50" : "#ff5252" }}>
            {passwordChecks.uppercase ? "✔" : "✖"} Tartalmaz nagybetűt
          </div>
          <div style={{ color: passwordChecks.special ? "#4caf50" : "#ff5252" }}>
            {passwordChecks.special ? "✔" : "✖"} Tartalmaz speciális karaktert
          </div>
        </div>

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

        <button className="btn btn-secondary w-100 mt-2" onClick={onClose}>
          Bezárás
        </button>
      </div>
    </div>
  );
}
