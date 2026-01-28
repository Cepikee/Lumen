"use client";
import React from "react";
import "./kapcsolat.css";

export default function KapcsolatPage() {
  const [name, setName] = React.useState("");
  const [emailFrom, setEmailFrom] = React.useState("");
  const [subject, setSubject] = React.useState("support");
  const [customSubject, setCustomSubject] = React.useState("");
  const [message, setMessage] = React.useState("");

  const handleSend = () => {
    const to = subject === "press" ? "press@utom.hu" : "support@utom.hu";

    const finalSubject =
      subject === "custom"
        ? customSubject || "Egyéb megkeresés"
        : subject === "press"
        ? "Média / sajtó megkeresés"
        : "Rendszer & működés";

    const body = `
Név: ${name}
Email: ${emailFrom}

Üzenet:
${message}
    `;

    window.location.href = `mailto:${to}?subject=${encodeURIComponent(
      finalSubject
    )}&body=${encodeURIComponent(body)}`;
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
              <div className="sub">Interjúk, együttműködések</div>
            </div>
          </div>

          <div className="item">
            <span className="dot" />
            <div>
              <div className="sectionTitle">Rendszer & működés</div>
              <div className="email">support@utom.hu</div>
              <div className="sub">Hibák, kérdések, visszajelzések</div>
            </div>
          </div>

          <div className="item large">
            <span className="dot" />
            <div>
              <div className="sectionTitle">Whitepaper</div>
              <ul>
                <li>csak fizikai formátumban</li>
                <li>előzetes egyeztetés után</li>
                <li>NDA aláírását követően</li>
              </ul>
              <p className="sub">
                Befektetők és technológiai partnerek számára.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
