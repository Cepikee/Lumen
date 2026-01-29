"use client";
import React, { useEffect, useState } from "react";
import "./kapcsolat.css";
import { useUserStore } from "@/store/useUserStore";

export default function KapcsolatPage() {
  const [name, setName] = useState("");
  const [emailFrom, setEmailFrom] = useState("");
  const [subject, setSubject] = useState("support");
  const [customSubject, setCustomSubject] = useState("");
  const [message, setMessage] = useState("");

  // 🔥 HONEYPOT (láthatatlan mező)
  const [honey, setHoney] = useState("");

  // 🔥 Küldés indulási idő (spam ellen)
  const [startTime, setStartTime] = useState(Date.now());

  // 🔥 Gomb tiltása küldés közben
  const [sending, setSending] = useState(false);

  // 🔥 GLOBAL THEME
  const theme = useUserStore((s) => s.theme);

  // 🔥 APPLY THEME CLASS TO <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-dark", "theme-light");

    if (theme === "dark") {
      root.classList.add("theme-dark");
    } else if (theme === "light") {
      root.classList.add("theme-light");
    } else {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(isDark ? "theme-dark" : "theme-light");
    }
  }, [theme]);

  /* ============================
      FRONTEND VALIDÁCIÓ + VÉDELEM
  ============================ */
  const validate = () => {
    if (!name.trim() || !emailFrom.trim() || !message.trim()) {
      return "Minden mező kitöltése kötelező.";
    }

    if (name.length > 100) return "A név túl hosszú.";
    if (emailFrom.length > 200) return "Az email túl hosszú.";
    if (message.length > 5000) return "Az üzenet túl hosszú.";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailFrom)) return "Érvénytelen email cím.";

    if (honey.trim() !== "") return "Bot aktivitás észlelve.";

    const diff = Date.now() - startTime;
    if (diff < 2000) return "Túl gyors küldés.";

    return null;
  };

  /* ============================
      BACKEND EMAIL KÜLDÉS
  ============================ */
  const handleSend = async () => {
    const error = validate();
    if (error) {
      alert(error);
      return;
    }

    setSending(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-form-start": String(startTime), // időbélyeg
        },
        body: JSON.stringify({
          name,
          emailFrom,
          subject,
          customSubject,
          message,
          honey,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("Üzenet sikeresen elküldve!");
        setName("");
        setEmailFrom("");
        setMessage("");
        setSubject("support");
        setCustomSubject("");
        setHoney("");
        setStartTime(Date.now());
      } else {
        alert("Hiba történt: " + data.error);
      }
    } catch {
      alert("Váratlan hiba történt.");
    }

    setSending(false);
  };

  return (
    <div className="page">
      <div className="container">
        {/* BAL OLDAL */}
        <div className="block">
          <h1 className="title">Kapcsolat</h1>

          <p className="intro">
            Az Utom egy független, AI-alapú automatikus hírgyártó és híradó platform.
            Ha kapcsolatba szeretnél lépni velem, az alábbi módokon teheted meg.
          </p>

          {/* GYORS ÜZENET */}
          <div className="quickMessage">
            <div className="quickTitle">Gyors üzenet</div>

            {/* HONEYPOT (láthatatlan) */}
            <input
              style={{ display: "none" }}
              value={honey}
              onChange={(e) => setHoney(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />

            <input
              placeholder="Név"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />

            <input
              placeholder="Email cím"
              value={emailFrom}
              maxLength={200}
              onChange={(e) => setEmailFrom(e.target.value)}
              className="input"
            />

            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input"
            >
              <option value="support">Rendszer & működés</option>
              <option value="press">Média / sajtó</option>
              <option value="bug">Hiba bejelentése</option>
              <option value="feature">Funkciókérés</option>
              <option value="business">Üzleti megkeresés</option>
              <option value="legal">Jogi / felhasználási kérdés</option>
              <option value="feedback">Visszajelzés</option>
              <option value="account">Fiók / hozzáférés</option>
              <option value="data">Adatkezelés</option>
              <option value="custom">Egyéb kérdés</option>
            </select>

            {subject === "custom" && (
              <input
                placeholder="Tárgy"
                value={customSubject}
                maxLength={200}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="input"
              />
            )}

            <textarea
              placeholder="Rövid üzenet…"
              rows={3}
              value={message}
              maxLength={5000}
              onChange={(e) => setMessage(e.target.value)}
              className="textarea"
            />

            <button
              onClick={handleSend}
              className="button"
              disabled={sending}
              style={{ opacity: sending ? 0.6 : 1 }}
            >
              {sending ? "Küldés..." : "Üzenet küldése"}
            </button>
          </div>
        </div>

        {/* JOBB OLDAL */}
        <div className="line" />

        <div className="block">
          <div className="item">
            <span className="dot" />
            <div>
              <div className="sectionTitle">Média / Sajtó</div>
              <div className="email">press@utom.hu</div>
              <ul>
                <li>Interjúk</li>
                <li>Együttműködések</li>
                <li>Marketing</li>
              </ul>
            </div>
          </div>

          <div className="item">
            <span className="dot" />
            <div>
              <div className="sectionTitle">Rendszer & működés</div>
              <div className="email">support@utom.hu</div>
              <ul>
                <li>Hibák</li>
                <li>Kérdések</li>
                <li>Visszajelzések</li>
              </ul>
            </div>
          </div>

          <div className="item">
            <span className="dot" />
            <div>
              <div className="sectionTitle">Általános Információk</div>
              <div className="email">support@utom.hu</div>
              <ul>
                <li>Ötletek</li>
                <li>Kérések</li>
                <li>Információk</li>
              </ul>
            </div>
          </div>

          <div className="item">
            <span className="dot" />
            <div>
              <div className="sectionTitle">Whitepaper</div>
              <ul>
                <li>csak fizikai formátumban</li>
                <li>előzetes egyeztetés után</li>
                <li>NDA aláírását követően</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
