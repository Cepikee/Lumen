"use client";

import { useState } from "react";
import UtomModal from "./UtomModal";

interface PinChangeModalProps {
  show: boolean;
  onClose: () => void;
}

export default function PinChangeModal({ show, onClose }: PinChangeModalProps) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    // 1) Validáció
    if (!currentPin || !newPin || !confirmPin) {
      setError("Minden mező kötelező.");
      return;
    }

    if (!/^\d{4}$/.test(newPin)) {
      setError("A PIN kódnak 4 számjegyből kell állnia.");
      return;
    }

    if (newPin !== confirmPin) {
      setError("Az új PIN kódok nem egyeznek.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/user/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPin,
          newPin,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("PIN kód frissítve!");
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
    <UtomModal show={show} onClose={onClose} title="PIN kód módosítása">
      <div style={{ padding: "10px 4px", maxWidth: "420px" }}>
        
        {/* Jelenlegi PIN */}
        <div className="mb-3">
          <label className="form-label fw-bold">Jelenlegi PIN</label>
          <input
            type="password"
            className="form-control"
            maxLength={4}
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value)}
          />
        </div>

        {/* Új PIN */}
        <div className="mb-3">
          <label className="form-label fw-bold">Új PIN</label>
          <input
            type="password"
            className="form-control"
            maxLength={4}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
          />
        </div>

        {/* Új PIN megerősítése */}
        <div className="mb-3">
          <label className="form-label fw-bold">Új PIN megerősítése</label>
          <input
            type="password"
            className="form-control"
            maxLength={4}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
          />
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
