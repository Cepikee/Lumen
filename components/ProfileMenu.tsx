"use client";

import { useState } from "react";
import ProfileView from "./ProfileView";
import SettingsView from "./SettingsView";
import UtomModal from "./UtomModal";
import { User } from "@/types/User";

export default function ProfileMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<null | "profile" | "settings">(null);

  function openModal(type: "profile" | "settings") {
    setOpen(false);
    setModal(type);
  }

  return (
    <div className="position-relative">

      {/* Profil ikon – DiceBear avatar */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          overflow: "hidden",
          cursor: "pointer",
          backgroundColor: "#444",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
            user.email
          )}`}
          alt="avatar"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
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
        <UtomModal show={true} onClose={() => setModal(null)} title="Profil">
          <ProfileView user={user} />
        </UtomModal>
      )}

      {modal === "settings" && (
        <UtomModal show={true} onClose={() => setModal(null)} title="Beállítások">
          <SettingsView user={user} />
        </UtomModal>
      )}
    </div>
  );
}
