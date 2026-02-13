"use client";

import { useState } from "react";
import UtomModal from "./UtomModal";

interface UsernameChangeModalProps {
  show: boolean;
  onClose: () => void;
  currentUsername: string;
}

export default function UsernameChangeModal({
  show,
  onClose,
  currentUsername,
}: UsernameChangeModalProps) {
  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError("");

    // 1) Validáció frontend oldalon
    if (!newUsername.trim()) {
      setError("A felhasználónév megadása kötelező.");
      return;
    }

    if (newUsername.length < 3 || newUsername.length > 20) {
      setError("A felhasználónév 3–20 karakter között lehet.");
      return;
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(newUsername)) {
      setError(
        "A felhasználónév csak betűket, számokat, pontot, kötőjelet és aláhúzást tartalmazhat."
      );
      return;
    }

    if (/^[0-9]+$/.test(newUsername)) {
      setError("A felhasználónév nem lehet csak szám.");
      return;
    }

    if (newUsername === currentUsername) {
      setError("Ez már a jelenlegi felhasználóneved.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/auth/username-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newUsername }),
      });

      const data = await res.json();

      if (data.success) {
        alert("A felhasználónév sikeresen megváltozott!");
        onClose();
        window.location.reload(); // frissítjük a UI-t
      } else {
        setError(data.message || "Hiba történt.");
      }
    } catch {
      setError("Váratlan hiba történt.");
    }

    setSaving(false);
  }

  return (
    <UtomModal show={show} onClose={onClose} title="Felhasználónév módosítása">
      <div style={{ padding: "10px 4px", maxWidth: "420px" }}>
        
        {/* Jelenlegi név */}
        <div className="mb-3">
          <label className="form-label fw-bold">Jelenlegi felhasználónév</label>
          <input
            type="text"
            className="form-control"
            value={currentUsername}
            disabled
          />
        </div>

        {/* Új név */}
        <div className="mb-3">
          <label className="form-label fw-bold">Új felhasználónév</label>
          <input
            type="text"
            className="form-control"
            maxLength={20}
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
          />
        </div>

        {/* Hibaüzenet */}
        {error && <div className="text-danger small mb-3">{error}</div>}

        {/* Gombok */}
        <div className="d-flex justify-content-end gap-2 mt-4">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Mégse
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Mentés…" : "Mentés"}
          </button>
        </div>
      </div>
    </UtomModal>
  );
}
