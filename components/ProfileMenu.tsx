"use client";

import { useState } from "react";
import ProfileView from "./ProfileView";
import SettingsView from "./SettingsView";
import UtomModal from "./UtomModal";
import { useUserStore } from "@/store/useUserStore";
import "@/styles/profile-badge.css";

export default function ProfileMenu() {
  const user = useUserStore((s) => s.user); // 🔥 mindig FRISS user
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<null | "profile" | "settings">(null);

  function openModal(type: "profile" | "settings") {
    setOpen(false);
    setModal(type);
  }

  // Korona ikon
  function CrownIcon({ size = 18 }: { size?: number }) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: "block" }}>
        <path d="M4 18L5 8L9 12L12 6L15 12L19 8L20 18H4Z" fill="#FFD700" />
      </svg>
    );
  }

  // 🔥 prémium logika – csak akkor true, ha tényleg prémium
  const premiumActive =
    user &&
    (user.is_premium === true ||
      (user.premium_until && new Date(user.premium_until).getTime() > Date.now()));

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
      <div className="profile-badge" onClick={() => setOpen(!open)}>
        <div className={`badge-ring ${premiumActive ? "premium" : ""}`}>
          <div className="avatar-inner">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "transparent" }} />
            )}
          </div>
        </div>

        {/* Korona */}
        {premiumActive && (
          <>
            <div className="crown" style={{ top: "-11px" }}>
              <CrownIcon size={22} />
            </div>
          </>
        )}
      </div> {/* ← EZ volt a hiányzó lezárás */}

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
