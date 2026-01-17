"use client";

import { useState } from "react";
import UtomModal from "./UtomModal";

interface PasswordChangeModalProps {
  show: boolean;
  onClose: () => void;
}

export default function PasswordChangeModal({ show, onClose }: PasswordChangeModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [logoutEverywhere, setLogoutEverywhere] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Minden mező kötelező.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Az új jelszavak nem egyeznek.");
      return;
    }

    if (newPassword.length < 8 || !/\d/.test(newPassword) || !/[a-zA-Z]/.test(newPassword)) {
      setError("A jelszónak legalább 8 karakteresnek kell lennie, és tartalmaznia kell számot és betűt.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          logoutEverywhere,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("Jelszó frissítve!");
        onClose();
      } else {
        setError(data.message || "Hiba történt.");
      }
    } catch {
      setError("Váratlan hiba történt.");
    }

    setSaving(false);
  }

  return (
    <UtomModal show={show} onClose={onClose} title="Jelszó módosítása">
      <div style={{ padding: "10px 4px", maxWidth: "420px" }}>
        {/* Jelenlegi jelszó */}
        <div className="mb-3">
          <label className="form-label fw-bold">Jelenlegi jelszó</label>
          <input
            type="password"
            className="form-control"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>

        {/* Új jelszó */}
        <div className="mb-3">
          <label className="form-label fw-bold">Új jelszó</label>
          <input
            type="password"
            className="form-control"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>

        {/* Új jelszó megerősítése */}
        <div className="mb-3">
          <label className="form-label fw-bold">Új jelszó megerősítése</label>
          <input
            type="password"
            className="form-control"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {/* Kijelentkezés minden eszközről */}
        <div className="form-check mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            checked={logoutEverywhere}
            onChange={(e) => setLogoutEverywhere(e.target.checked)}
            id="logoutEverywhere"
          />
          <label className="form-check-label" htmlFor="logoutEverywhere">
            Kijelentkezés minden eszközről
          </label>
          <div className="text-muted small mt-1">
            Ha bejelölöd, az összes böngészőből és appból kijelentkezel.
          </div>
        </div>

        {/* Hibaüzenet */}
        {error && (
          <div className="text-danger small mb-3">{error}</div>
        )}

        {/* Gombok */}
        <div className="d-flex justify-content-end gap-2 mt-4">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Mégse
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Mentés…" : "Mentés"}
          </button>
        </div>
      </div>
    </UtomModal>
  );
}
