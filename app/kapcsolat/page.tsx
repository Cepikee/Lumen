"use client";
import React, { useEffect } from "react";
import "./kapcsolat.css";
import { useUserStore } from "@/store/useUserStore";

export default function KapcsolatPage() {
  const [name, setName] = React.useState("");
  const [emailFrom, setEmailFrom] = React.useState("");
  const [subject, setSubject] = React.useState("support");
  const [customSubject, setCustomSubject] = React.useState("");
  const [message, setMessage] = React.useState("");

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
      BACKEND EMAIL KÜLDÉS
  ============================ */
  const handleSend = async () => {
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          emailFrom,
          subject,
          customSubject,
          message,
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
      } else {
        alert("Hiba történt: " + data.error);
      }
    } catch (err) {
      alert("Váratlan hiba történt.");
    }
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

            <input
              placeholder="Név"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />

            <input
              placeholder="Email cím"
              value={emailFrom}
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
                onChange={(e) => setCustomSubject(e.target.value)}
                className="input"
              />
            )}

            <textarea
              placeholder="Rövid üzenet…"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="textarea"
            />

            <button onClick={handleSend} className="button">
              Üzenet küldése
            </button>
          </div>
        </div>

        {/* IDŐVONAL */}
        <div className="line" />

        {/* JOBB OLDAL */}
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
