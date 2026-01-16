"use client";

import { useState } from "react";

export default function LoginModal() {
  const [open, setOpen] = useState(false);

  // 🔥 PANEL VÁLTÓ
  const [mode, setMode] = useState<"login" | "forgot">("login");

  // LOGIN mezők
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");

  // FORGOT PASSWORD mezők
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleLogin = async () => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, pin }),
    });

    const data = await res.json();

    if (data.success) {
      window.location.reload();
    } else {
      alert(data.message || "Hibás adatok.");
    }
  };

  const handleForgot = async (e: any) => {
    e.preventDefault();
    setForgotStatus("loading");

    await fetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: forgotEmail }),
    });

    setForgotStatus("success");
  };

  return (
    <>
      {/* GOMB A HEADERBEN */}
      <button
        className="btn btn-outline-primary"
        onClick={() => {
          setOpen(true);
          setMode("login");
        }}
      >
        Bejelentkezés
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
            {/* 🔥 LOGIN PANEL */}
            {mode === "login" && (
              <>
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

                {/* 🔥 IDE JÖN A LINK */}
                <p
                  className="mt-3 text-center"
                  style={{ cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => setMode("forgot")}
                >
                  Elfelejtetted a jelszavad?
                </p>

                <button
                  className="btn btn-secondary w-100 mt-2"
                  onClick={() => setOpen(false)}
                >
                  Bezárás
                </button>
              </>
            )}

            {/* 🔥 FORGOT PASSWORD PANEL */}
            {mode === "forgot" && (
              <>
                <h3 className="mb-3">Jelszó visszaállítása</h3>

                {forgotStatus === "success" ? (
                  <p>
                    Ha létezik ilyen email cím, elküldtük a visszaállító linket.
                  </p>
                ) : (
                  <form onSubmit={handleForgot}>
                    <input
                      className="form-control mb-3"
                      placeholder="Email cím"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />

                    <button
                      className="btn btn-primary w-100"
                      type="submit"
                      disabled={forgotStatus === "loading"}
                    >
                      {forgotStatus === "loading"
                        ? "Küldés..."
                        : "Visszaállító email küldése"}
                    </button>
                  </form>
                )}

                <p
                  className="mt-3 text-center"
                  style={{ cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => setMode("login")}
                >
                  Vissza a bejelentkezéshez
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
