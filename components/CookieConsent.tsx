"use client";

import { useEffect, useState } from "react";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const decision = localStorage.getItem("cookie-consent");
    if (decision !== "accepted" && decision !== "rejected") {
      setVisible(true);
    }
  }, []);

  const decide = (value: "accepted" | "rejected") => {
    localStorage.setItem("cookie-consent", value);
    window.dispatchEvent(new Event("utom:cookie-consent"));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="position-fixed bottom-0 start-0 end-0 p-3"
      style={{
        zIndex: 9999,
        background: "var(--bs-body-bg)",
        borderTop: "1px solid var(--bs-border-color)",
        boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
      }}
    >
      <div className="container d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
        <p className="mb-0 small text-muted">
          A működéshez szükséges technikai tárolás mellett, hozzájárulásod esetén analitikát használunk. Részletek az{" "}
          <a href="/adatvedelem" className="text-decoration-underline">adatvédelmi tájékoztatóban</a>.
        </p>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => decide("rejected")}>
            Csak szükséges
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => decide("accepted")}>
            Analitika engedélyezése
          </button>
        </div>
      </div>
    </div>
  );
}
