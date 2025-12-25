"use client";

import { useEffect, useState } from "react";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookie-consent");
    if (!accepted) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie-consent", "accepted");
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
        <p className="mb-0 small text-muted"> Az Utom.hu sütiket használ a működéshez és az élmény javításához. A használattal elfogadod az{" "} 
          <a href="/adatvedelem" className="text-decoration-underline"> adatvédelmi irányelveket </a>. </p>
        <button className="btn btn-primary btn-sm" onClick={accept}>
          Elfogadom
        </button>
      </div>
    </div>
  );
}
