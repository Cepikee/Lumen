"use client";

import { useState } from "react";
import { User } from "@/types/User";
import ThemeSwitch from "@/components/ThemeSwitch";
import { useUserStore } from "@/store/useUserStore";
import PasswordChangeModal from "@/components/PasswordChangeModal";
import PinChangeModal from "@/components/PinChangeModal";

export default function SettingsView({ user }: { user: User }) {
  const [nickname, setNickname] = useState(user.nickname);
  const [bio, setBio] = useState(user.bio || "");
  const [saving, setSaving] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  const setUser = useUserStore((s) => s.setUser);

  const premiumActive =
    user.is_premium ||
    (user.premium_until && new Date(user.premium_until) > new Date());

  const premiumUntil = user.premium_until
    ? new Date(user.premium_until).toLocaleString("hu-HU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  async function handleSave() {
    setSaving(true);

    try {
      const res = await fetch("/api/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, bio }),
      });

      const data = await res.json();

      if (data.success) {
        setUser({ ...user, nickname, bio });
        alert("Beállítások elmentve!");
      } else {
        alert("Hiba történt: " + data.message);
      }
    } catch (err) {
      alert("Váratlan hiba történt.");
    }

    setSaving(false);
  }

  return (
    <div style={{ padding: "20px", maxWidth: "450px" }}>
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

     {/* NICKNAME */}
<div className="mb-3">
  <div className="mb-1">
    <strong>Felhasználónév:</strong> {nickname}
  </div>
  <div
    className="text-primary"
    style={{ cursor: "pointer", fontWeight: "500" }}
  >
    Felhasználónév váltás kérelmezése →
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
        <div
          className="text-primary mt-1"
          style={{ cursor: "pointer", fontWeight: "500" }}
        >
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

      {/* MODALS */}
      <PasswordChangeModal
        show={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
      <PinChangeModal
        show={showPinModal}
        onClose={() => setShowPinModal(false)}
      />
    </div>
  );
}
