"use client";

import { useEffect, useState } from "react";
import ThemeSwitch from "@/components/ThemeSwitch";
import { useUserStore } from "@/store/useUserStore";
import PasswordChangeModal from "@/components/PasswordChangeModal";
import PinChangeModal from "@/components/PinChangeModal";
import AvatarModal from "@/components/AvatarModal";
import { PREMIUM_FRAMES } from "@/types/premiumFrames";
import FrameModal from "@/components/FrameModal";
import UsernameChangeModal from "./UsernameChangeModal";

function getAvatarUrl(user: any) {
  const style = user.avatar_style || "bottts";
  const seed = encodeURIComponent(user.avatar_seed || user.nickname || "user");
  return `https://api.dicebear.com/8.x/${style}/svg?seed=${seed}`;
}

export default function SettingsView() {
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);

  // 🔥 MODAL HOOKOK
  const [showFrameModal, setShowFrameModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  // The auth probe starts with no user. Reading `user!.nickname` during that
  // first render crashes the settings modal before its loading state can show.
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.nickname) setNickname(user.nickname);
  }, [user?.nickname]);

  useEffect(() => {
    setBio(user?.bio ?? "");
  }, [user?.bio]);

  if (!user) return <div>Betöltés...</div>;

  // 🔥 Bármelyik modál nyitva van?
  const anyModalOpen =
    showAvatarModal ||
    showFrameModal ||
    showPasswordModal ||
    showPinModal ||
    showUsernameModal;

  const premiumActive = user.isPremium === true;

  const premiumDate = user.premium_until ? new Date(user.premium_until) : null;
  const premiumUntil = premiumDate && !Number.isNaN(premiumDate.getTime())
    ? premiumDate.toLocaleString("hu-HU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const currentFrame = PREMIUM_FRAMES.find((f) => f.id === user.avatar_frame);

  async function handleSave() {
    setSaving(true);

    try {
      const res = await fetch("/api/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success === true) {
        setUser({ ...user!, bio });
        alert("Beállítások elmentve!");
      } else {
        alert("Hiba történt: " + (data?.message || "Ismeretlen hiba."));
      }
    } catch (err) {
      alert("Váratlan hiba történt.");
    }

    setSaving(false);
  }

  return (
    <div style={{ padding: "20px", maxWidth: "450px" }}>
      {/* 🔥 MODALOK */}
      <AvatarModal show={showAvatarModal} onClose={() => setShowAvatarModal(false)} />
      <FrameModal show={showFrameModal} onClose={() => setShowFrameModal(false)} />
      <PasswordChangeModal show={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      <PinChangeModal show={showPinModal} onClose={() => setShowPinModal(false)} />
      <UsernameChangeModal
        show={showUsernameModal}
        onClose={() => setShowUsernameModal(false)}
        currentUsername={nickname}
        usernameChangedAt={user.username_changed_at}
      />

      {/* 🔥 Ha bármelyik modál nyitva van → háttér eltűnik */}
      {!anyModalOpen && (
        <>
          {/* PREMIUM INFO */}
          <div className="mb-4">
            <strong>Prémium státusz:</strong>
            <div>
              {premiumActive ? (
                <span style={{ color: "gold", fontWeight: "bold" }}>
                  ⭐ Aktív – {premiumUntil}
                </span>
              ) : (
                <span>Inaktív</span>
              )}
            </div>
          </div>

          {/* AVATAR BLOKK */}
          <div className="mb-4">
            <strong>Avatar:</strong>
            <div className="d-flex align-items-center gap-3 mt-2">
              <img
                src={getAvatarUrl(user)}
                alt="avatar"
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />

              <div
                className="text-primary"
                style={{ cursor: "pointer", fontWeight: "500" }}
                onClick={() => setShowAvatarModal(true)}
              >
                Avatar módosítása →
              </div>
            </div>
          </div>

          {/* PRÉMIUM KERET */}
          {premiumActive && (
            <div className="mb-4">
              <strong>Prémium keret:</strong>

              <div className="d-flex align-items-center gap-3 mt-2">
                <div
                  className="premium-frame-preview"
                  style={{ position: "relative", width: "64px", height: "64px" }}
                >
                  <img
                    src={getAvatarUrl(user)}
                    alt="avatar"
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      position: "relative",
                      zIndex: 2,
                    }}
                  />

                  {currentFrame?.type === "css" && (
                    <div
                      className={currentFrame.className}
                      style={{
                        position: "absolute",
                        top: "-18%",
                        left: "-18%",
                        width: "136%",
                        height: "136%",
                        borderRadius: "50%",
                        pointerEvents: "none",
                        zIndex: 3,
                      }}
                    ></div>
                  )}

                  {currentFrame?.type === "png" && (
                    <img
                      src={currentFrame.src}
                      className={currentFrame.className}
                      style={{
                        position: "absolute",
                        top: "-18%",
                        left: "-18%",
                        width: "136%",
                        height: "auto",
                        pointerEvents: "none",
                        zIndex: 3,
                      }}
                    />
                  )}
                </div>

                <div
                  className="text-primary"
                  style={{ cursor: "pointer", fontWeight: "500" }}
                  onClick={() => setShowFrameModal(true)}
                >
                  Keret módosítása →
                </div>
              </div>
            </div>
          )}

          {/* USERNAME */}
          <div className="mb-3">
            <div className="mb-1">
              <strong>Felhasználónév:</strong> {nickname}
            </div>
            <div
              className="text-primary"
              style={{ cursor: "pointer", fontWeight: "500" }}
              onClick={() => setShowUsernameModal(true)}
            >
              Felhasználónév módosítása →
            </div>
          </div>

          {/* BIO */}
          <div className="mb-3">
            <label className="form-label fw-bold">Bemutatkozás</label>
            <textarea
              className="form-control"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          {/* THEME */}
          <div className="mb-4">
            <ThemeSwitch />
          </div>

          {/* EMAIL */}
          <div className="mb-3">
            <strong>Email:</strong> {user.email}
            <div className="text-primary mt-1" style={{ cursor: "pointer", fontWeight: "500" }}>
              Email módosítása →
            </div>
          </div>

          {/* PIN */}
          <div className="mb-3">
            <strong>PIN kód:</strong>
            <div
              className="text-primary"
              style={{ cursor: "pointer", fontWeight: "500" }}
              onClick={() => setShowPinModal(true)}
            >
              PIN kód módosítása →
            </div>
          </div>

          {/* PASSWORD */}
          <div className="mb-4">
            <strong>Jelszó:</strong>
            <div
              className="text-primary"
              style={{ cursor: "pointer", fontWeight: "500" }}
              onClick={() => setShowPasswordModal(true)}
            >
              Jelszó módosítása →
            </div>
          </div>

          {/* SAVE BUTTON */}
          <button
            onClick={handleSave}
            className="btn btn-primary w-100"
            disabled={saving}
          >
            {saving ? "Mentés..." : "Mentés"}
          </button>
        </>
      )}
    </div>
  );
}
