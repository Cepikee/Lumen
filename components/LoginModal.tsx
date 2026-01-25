"use client";

import { useState } from "react";
import RegisterModal from "./RegisterModal";

export default function LoginModal() {
  const [open, setOpen] = useState(false);

  const [mode, setMode] = useState<"login" | "forgot" | "forgot_pin">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<"idle" | "loading" | "success">("idle");

  const [forgotPinEmail, setForgotPinEmail] = useState("");
  const [forgotPinStatus, setForgotPinStatus] = useState<"idle" | "loading" | "success">("idle");

  const [showRegister, setShowRegister] = useState(false);

  const handleLogin = async () => {
    try {
      // @ts-ignore
      const recaptchaToken = await grecaptcha.execute(
        process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!,
        { action: "login" }
      );

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, pin, recaptchaToken, rememberMe }),
      });

      const text = await res.text();
      if (!text) {
        alert("A szerver nem adott választ.");
        return;
      }

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        alert("A szerver hibás választ adott.");
        return;
      }

      if (data.success) {
        window.location.reload();
      } else {
        alert(data.message || "Hibás adatok.");
      }
    } catch {
      alert("Hiba történt a bejelentkezés során.");
    }
  };

  const handleForgot = async (e: any) => {
    e.preventDefault();
    setForgotStatus("loading");

    try {
      // @ts-ignore
      const recaptchaToken = await grecaptcha.execute(
        process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!,
        { action: "forgot_password" }
      );

      await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, recaptchaToken }),
      });

      setForgotStatus("success");
    } catch {
      setForgotStatus("idle");
      alert("Hiba történt.");
    }
  };

  const handleForgotPin = async (e: any) => {
    e.preventDefault();
    setForgotPinStatus("loading");

    try {
      // @ts-ignore
      const recaptchaToken = await grecaptcha.execute(
        process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!,
        { action: "forgot_pin" }
      );

      await fetch("/api/auth/request-pin-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotPinEmail, recaptchaToken }),
      });

      setForgotPinStatus("success");
    } catch {
      setForgotPinStatus("idle");
      alert("Hiba történt.");
    }
  };

  return (
    <>
      <button
        className="btn btn-outline-primary"
        onClick={() => {
          setOpen(true);
          setMode("login");
        }}
      >
        Bejelentkezés
      </button>

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

                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="rememberMe">
                    Maradjak bejelentkezve
                  </label>
                </div>

                <button className="btn btn-success w-100" onClick={handleLogin}>
                  Belépés
                </button>

                <div className="mt-3 text-center">
                  <p
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => setMode("forgot")}
                  >
                    Elfelejtetted a jelszavad?
                  </p>

                  <p
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => setMode("forgot_pin")}
                  >
                    Elfelejtetted a PIN kódod?
                  </p>

                  <p className="mt-2">
                    Nincs még fiókod?{" "}
                    <span
                      style={{ cursor: "pointer", textDecoration: "underline" }}
                      onClick={() => {
                        setOpen(false);
                        setShowRegister(true);
                      }}
                    >
                      Regisztrálj!
                    </span>
                  </p>
                </div>

                <button
                  className="btn btn-secondary w-100 mt-2"
                  onClick={() => setOpen(false)}
                >
                  Bezárás
                </button>
              </>
            )}

            {mode === "forgot" && (
              <>
                <h3 className="mb-3">Jelszó visszaállítása</h3>

                {forgotStatus === "success" ? (
                  <p>Ha létezik ilyen email cím, elküldtük a visszaállító linket.</p>
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
                      {forgotStatus === "loading" ? "Küldés..." : "Visszaállító email küldése"}
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

            {mode === "forgot_pin" && (
              <>
                <h3 className="mb-3">PIN kód visszaállítása</h3>

                {forgotPinStatus === "success" ? (
                  <p>Ha létezik ilyen email cím, elküldtük a PIN visszaállító linket.</p>
                ) : (
                  <form onSubmit={handleForgotPin}>
                    <input
                      className="form-control mb-3"
                      placeholder="Email cím"
                      type="email"
                      value={forgotPinEmail}
                      onChange={(e) => setForgotPinEmail(e.target.value)}
                      required
                    />

                    <button
                      className="btn btn-primary w-100"
                      type="submit"
                      disabled={forgotPinStatus === "loading"}
                    >
                      {forgotPinStatus === "loading" ? "Küldés..." : "PIN visszaállító email küldése"}
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

      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}
    </>
  );
}
