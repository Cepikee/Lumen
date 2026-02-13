"use client";

import { useState, useEffect } from "react";
import UtomModal from "./UtomModal";

interface UsernameChangeModalProps {
  show: boolean;
  onClose: () => void;
  currentUsername: string;
  usernameChangedAt?: string | null; // ezt add át a SettingsView-ből
}

export default function UsernameChangeModal({
  show,
  onClose,
  currentUsername,
  usernameChangedAt,
}: UsernameChangeModalProps) {
  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [valid, setValid] = useState<boolean | null>(null);

  // Tiltott nevek
  const forbidden = ["admin", "moderator", "support", "utom", "system"];

  // Cooldown számítása
  const lastChange = usernameChangedAt ? new Date(usernameChangedAt) : null;
  const daysSince =
    lastChange ? Math.floor((Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const daysLeft = daysSince !== null ? Math.max(0, 30 - daysSince) : 0;

  // Élő validáció
  useEffect(() => {
    if (!newUsername.trim()) {
      setValid(null);
      return;
    }

    if (newUsername.length < 3 || newUsername.length > 20) {
      setValid(false);
      return;
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(newUsername)) {
      setValid(false);
      return;
    }

    if (/^[0-9]+$/.test(newUsername)) {
      setValid(false);
      return;
    }

    if (forbidden.includes(newUsername.toLowerCase())) {
      setValid(false);
      return;
    }

    setValid(true);
  }, [newUsername]);

  async function handleSave() {
    setError("");

    if (daysLeft > 0) {
      setError(`Még ${daysLeft} napig nem változtathatod meg a felhasználóneved.`);
      return;
    }

    if (!valid) {
      setError("A felhasználónév nem felel meg a követelményeknek.");
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
        window.location.reload();
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

        {/* Figyelmeztetés */}
        <div className="alert alert-warning small mb-3" style={{ fontSize: "0.85rem" }}>
          <strong>Figyelem!</strong>
          <ul className="mt-2 mb-0">
            <li>A felhasználónév 3–20 karakter hosszú lehet.</li>
            <li>Csak betűk, számok, pont, kötőjel és aláhúzás használható.</li>
            <li>Nem lehet kizárólag számokból.</li>
            <li>Tiltott nevek: admin, moderator, support, utom, system.</li>
            <li>A módosítás után 30 napig nem változtathatod újra.</li>
            <li>A változtatásról email értesítést küldünk.</li>
          </ul>
        </div>

        {/* Cooldown */}
        {daysLeft > 0 && (
          <div className="alert alert-danger small mb-3">
            Legközelebb <strong>{daysLeft} nap</strong> múlva változtathatsz nevet.
          </div>
        )}

        {/* Jelenlegi név */}
        <div className="mb-3">
          <label className="form-label fw-bold">Jelenlegi felhasználónév</label>
          <input type="text" className="form-control" value={currentUsername} disabled />
        </div>

        {/* Új név */}
        <div className="mb-1">
          <label className="form-label fw-bold">Új felhasználónév</label>
          <input
            type="text"
            className={`form-control ${valid === null ? "" : valid ? "is-valid" : "is-invalid"}`}
            maxLength={20}
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
          />
        </div>

        {/* Karakter számláló */}
        <div className="text-end small mb-3">
          {newUsername.length}/20 karakter
        </div>

        {/* Hibaüzenet */}
        {error && <div className="text-danger small mb-3">{error}</div>}

        {/* Gombok */}
        <div className="d-flex justify-content-end gap-2 mt-4">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Mégse
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || daysLeft > 0}
          >
            {saving ? "Mentés…" : "Mentés"}
          </button>
        </div>
      </div>
    </UtomModal>
  );
}
