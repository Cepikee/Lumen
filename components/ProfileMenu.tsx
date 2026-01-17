"use client";

import { useState } from "react";
import SpikeModal from "./UtomModal"; // fontos!
import ProfileView from "./ProfileView";
import SettingsView from "./SettingsView";
import UtomModal from "./UtomModal";

type User = { id: number; email: string };

export default function ProfileMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<null | "profile" | "settings">(null);

  function openModal(type: "profile" | "settings") {
    setOpen(false);      // dropdown bezár
    setModal(type);      // modal megnyit
  }

  return (
    <div className="position-relative">

      {/* Profil ikon */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          backgroundColor: "#444",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "white",
          fontWeight: "bold",
          userSelect: "none",
        }}
      >
        {user.email[0].toUpperCase()}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="shadow"
          style={{
            position: "absolute",
            right: 0,
            top: "48px",
            background: "white",
            borderRadius: "8px",
            overflow: "hidden",
            minWidth: "180px",
            zIndex: 9999,
          }}
        >
          {/* PROFIL */}
          <button
            onClick={() => openModal("profile")}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "none",
              background: "white",
              textAlign: "left",
              cursor: "pointer",
              color: "#333",
            }}
          >
            Profil megtekintése
          </button>

          {/* BEÁLLÍTÁSOK */}
          <button
            onClick={() => openModal("settings")}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "none",
              background: "white",
              textAlign: "left",
              cursor: "pointer",
              color: "#333",
            }}
          >
            Beállítások
          </button>

          {/* KIJELENTKEZÉS */}
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.reload();
            }}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "none",
              background: "white",
              textAlign: "left",
              cursor: "pointer",
              color: "#d00",
            }}
          >
            Kijelentkezés
          </button>
        </div>
      )}

      {/* MODALOK */}
      {modal === "profile" && (
        <UtomModal show={true} onClose={() => setModal(null)}>
          <ProfileView user={user} />
        </UtomModal>
      )}

      {modal === "settings" && (
        <UtomModal show={true} onClose={() => setModal(null)}>
          <SettingsView user={user} />
        </UtomModal>
      )}
    </div>
  );
}
