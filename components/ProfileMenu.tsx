"use client";

import { useState } from "react";
import ProfileView from "./ProfileView";
import SettingsView from "./SettingsView";
import UtomModal from "./UtomModal";
import { useUserStore } from "@/store/useUserStore";
import "@/styles/profile-badge.css";
import { PREMIUM_FRAMES } from "@/types/premiumFrames";

export default function ProfileMenu() {
  // 🔥 HOOKOK MINDIG LEGELŐL!
  const user = useUserStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<null | "profile" | "settings">(null);
  const [logoutError, setLogoutError] = useState(false);

  // 🔥 user után jöhet minden, ami user-t használ
  const currentFrame = PREMIUM_FRAMES.find((f) => f.id === user?.avatar_frame);

  function openModal(type: "profile" | "settings") {
    setOpen(false);
    setModal(type);
  }

  const premiumActive = user?.isPremium === true;

  const avatarUrl =
    user?.avatar_style && user?.avatar_seed
      ? `https://api.dicebear.com/9.x/${user.avatar_style}/svg?seed=${encodeURIComponent(
          user.avatar_seed
        )}`
      : null;

  return (
    <div className="position-relative">
      {/* Profil ikon */}
      <div
        className="profile-badge premium-avatar"
        onClick={() => setOpen(!open)}
      >
        <div className="avatar-inner">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="avatar-image" />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "transparent",
              }}
            />
          )}
        </div>

        {/* Prémium keret overlay */}
        {premiumActive && currentFrame && (
          <>
            {currentFrame.type === "css" && (
  <div
    key={currentFrame.id}   // 🔥 EZ A FIX
    className={currentFrame.className}
  ></div>
)}


            {currentFrame.type === "png" && (
              <img
                src={currentFrame.src}
                className={`avatar-frame ${currentFrame.className}`}
                alt=""
              />
            )}
          </>
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
              try {
                const res = await fetch("/api/auth/logout", { method: "POST" });
                if (!res.ok) throw new Error(`logout_${res.status}`);
                window.location.reload();
              } catch {
                setLogoutError(true);
              }
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
          {logoutError && <div className="text-danger small px-3 pb-2">A kijelentkezés nem sikerült.</div>}
        </div>
      )}

      {/* MODALOK */}
      {modal === "profile" && (
        <UtomModal
          show={true}
          onClose={() => setModal(null)}
          title="Profil"
        >
          <ProfileView />
        </UtomModal>
      )}

      {modal === "settings" && (
        <UtomModal
          show={true}
          onClose={() => setModal(null)}
          title="Beállítások"
        >
          <SettingsView />
        </UtomModal>
      )}
    </div>
  );
}
