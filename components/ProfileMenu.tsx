"use client";

import { useState } from "react";
import ProfileView from "./ProfileView";
import SettingsView from "./SettingsView";
import UtomModal from "./UtomModal";
import { useUserStore } from "@/store/useUserStore";

export default function ProfileMenu() {
  const user = useUserStore((s) => s.user); // 🔥 mindig FRISS user
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<null | "profile" | "settings">(null);

  function openModal(type: "profile" | "settings") {
    setOpen(false);
    setModal(type);
  }

  // 🔥 prémium logika – csak akkor true, ha tényleg prémium
  const premiumActive =
    user &&
    (user.is_premium === true ||
      (user.premium_until &&
        new Date(user.premium_until).getTime() > Date.now()));

  // 🔥 DiceBear 8.x avatar URL
  const avatarUrl =
    user?.avatar_style && user?.avatar_seed
      ? `https://api.dicebear.com/8.x/${user.avatar_style}/svg?seed=${encodeURIComponent(
          user.avatar_seed
        )}`
      : null;

  return (
    <div className="position-relative">

      {/* Profil ikon */}
      <div
        onClick={() => setOpen(!open)}
        className={premiumActive ? "premium-avatar" : ""}
        style={{
          position: "relative",
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
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="avatar"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "50%",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#555",
              borderRadius: "50%",
            }}
          />
        )}
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
            Profil
          </button>

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

          <a
            href="/premium"
            style={{
              display: "block",
              width: "100%",
              padding: "10px 14px",
              textDecoration: "none",
              background: "white",
              textAlign: "left",
              cursor: "pointer",
              color: "#333",
            }}
          >
            Prémium
          </a>

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
          <ProfileView />
        </UtomModal>
      )}

      {modal === "settings" && (
        <UtomModal show={true} onClose={() => setModal(null)} title="Beállítások">
         <SettingsView />
        </UtomModal>
      )}
    </div>
  );
}
