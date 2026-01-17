"use client";

import { useState } from "react";
import { User } from "@/types/User";
import ThemeSwitch from "@/components/ThemeSwitch";
import { useUserStore } from "@/store/useUserStore"; // 🔥 GLOBÁLIS USER UPDATE

export default function SettingsView({ user }: { user: User }) {
  const [nickname, setNickname] = useState(user.nickname);
  const [bio, setBio] = useState(user.bio || "");
  const [saving, setSaving] = useState(false);

  const setUser = useUserStore((s) => s.setUser); // 🔥 Zustand setter

  const premiumActive =
    user.is_premium ||
    (user.premium_until &&
      new Date(user.premium_until) > new Date());

  async function handleSave() {
    setSaving(true);

    try {
      const res = await fetch("/api/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          bio,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // 🔥 AZONNALI GLOBÁLIS USER FRISSÍTÉS
        setUser({
          ...user,
          nickname,
          bio,
        });

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
      <h2 className="mb-3">Beállítások</h2>

      {/* PREMIUM INFO */}
      <div className="mb-4">
        <strong>Prémium státusz:</strong>
        <div>
          {premiumActive ? (
            <span style={{ color: "gold", fontWeight: "bold" }}>
              ⭐ Aktív prémium
            </span>
          ) : (
            <span>Nem prémium felhasználó</span>
          )}
        </div>

        {user.premium_until && (
          <div className="text-muted small">
            Lejár:{" "}
            {new Date(user.premium_until).toLocaleDateString("hu-HU")}
          </div>
        )}
      </div>

      {/* NICKNAME */}
      <div className="mb-3">
        <label className="form-label fw-bold">Felhasználónév</label>
        <input
          className="form-control"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <div className="text-muted small">
          Csak betűk, számok és _ (3–20 karakter)
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
        <label className="form-label fw-bold">Téma</label>
        <ThemeSwitch />
      </div>

      {/* EMAIL */}
      <div className="mb-3">
        <strong>Email:</strong>
        <div>{user.email}</div>
      </div>

      {/* PIN */}
      <div className="mb-3">
        <strong>PIN kód:</strong>
        <div className="text-muted small">A PIN módosítása hamarosan érkezik</div>
      </div>

      {/* PASSWORD */}
      <div className="mb-4">
        <strong>Jelszó:</strong>
        <div className="text-muted small">A jelszó módosítása hamarosan érkezik</div>
      </div>

      {/* SAVE BUTTON */}
      <button
        onClick={handleSave}
        className="btn btn-primary w-100"
        disabled={saving}
      >
        {saving ? "Mentés..." : "Mentés"}
      </button>
    </div>
  );
}
