"use client";

import { useEffect, useState } from "react";
import UtomModal from "@/components/UtomModal";
import { useUserStore } from "@/store/useUserStore";

type AvatarSelection = {
  style: string;
  seed: string;
  format: "svg";
};

// 🔥 Gyors, cache-elhető seed generálás
function generateSeeds(count: number, page: number, style: string) {
  return Array.from(
    { length: count },
    (_, i) => `utom_${style}_${page}_${i}`
  );
}

// DiceBear stílusok
const STYLES = [
  { id: "adventurer", label: "Kalandor" },
  { id: "adventurer-neutral", label: "Kalandor" },
  { id: "avataaars", label: "Avatárok" },
  { id: "big-ears", label: "Nagy fülek" },
  { id: "big-ears-neutral", label: "Nagy fülek" },
  { id: "big-smile", label: "Nagy mosoly" },
  { id: "bottts", label: "Robot" },
  { id: "bottts-neutral", label: "Robot" },
  { id: "croodles", label: "Firkarajz" },
  { id: "croodles-neutral", label: "Firkarajz (semleges)" },
  { id: "open-peeps", label: "Nyitott figurák" },
  { id: "pixel-art", label: "Pixel Art" },
  { id: "personas", label: "Személyiségek" },
];

export default function AvatarModal({
  show,
  onClose,
}: {
  show: boolean;
  onClose: () => void;
}) {
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);

  const [style, setStyle] = useState<string>(user?.avatar_style || "bottts");
  const [page, setPage] = useState(0);
  const [seeds, setSeeds] = useState<string[]>([]);
  const [selected, setSelected] = useState<AvatarSelection | null>(null);
  const [saving, setSaving] = useState(false);

  // 🔥 Gyors seed generálás minden lapozásnál és stílusváltásnál
  useEffect(() => {
    setSeeds(generateSeeds(10, page, style));
    setSelected(null);
  }, [page, style]);

  // 🔥 A jelenlegi user avatar beállítása
  useEffect(() => {
    if (!user) return;
    setSelected({
      style: user.avatar_style || "bottts",
      seed: user.avatar_seed || user.nickname,
      format: "svg",
    });
  }, [user]);

  // 🔥 Gyors DiceBear URL
  function getUrl(s: string, seed: string) {
    return `https://api.dicebear.com/9.x/${s}/svg?seed=${encodeURIComponent(
      seed
    )}&size=64&scale=90`;
  }

  async function handleSave() {
    if (!selected || !user) return;
    setSaving(true);

    try {
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success === true) {
        setUser({
          ...user,
          avatar_style: selected.style,
          avatar_seed: selected.seed,
          avatar_format: "svg",
        });
        onClose();
      } else {
        alert("Hiba történt: " + (data?.message ?? "Ismeretlen hiba"));
      }
    } catch (e) {
      alert("Váratlan hiba történt.");
    }

    setSaving(false);
  }

  if (!user) return null;

  return (
    <UtomModal show={show} onClose={onClose} title="Avatar módosítása">
      {/* Stílus választó */}
      <div className="mb-3">
        <strong>Stílus:</strong>

        <div className="style-grid mt-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              className="btn btn-sm style-btn"
              style={{
                border: s.id === style ? "2px solid #0d6efd" : "1px solid #555",
                background: s.id === style ? "#0d6efd" : "transparent",
              }}
              onClick={() => {
                setStyle(s.id);
                setPage(0);
                setSelected(null);
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

{/* Lapozás */}
<div className="d-flex justify-content-between align-items-center mb-3">

  {/* ELŐZŐ gomb */}
  <button
    type="button"
    className="btn btn-sm style-btn"
    style={{
      border: "1px solid #555",
      background: "transparent",
      opacity: page === 0 ? 0.4 : 1,
      cursor: page === 0 ? "not-allowed" : "pointer",
    }}
    onClick={() => page > 0 && setPage(page - 1)}
    disabled={page === 0}
  >
    ← Előző
  </button>

  {/* OLDAL SZÁM */}
  <span
    className="btn btn-sm style-btn"
    style={{
      border: "1px solid #555",
      background: "transparent",
      fontWeight: 500,
      cursor: "default",
    }}
  >
    Oldal: {page + 1}
  </span>

  {/* KÖVETKEZŐ gomb */}
  <button
    type="button"
    className="btn btn-sm style-btn"
    style={{
      border: "1px solid #555",
      background: "transparent",
    }}
    onClick={() => setPage(page + 1)}
  >
    Következő →
  </button>

</div>



      {/* Avatarok */}
      <div className="d-flex flex-wrap gap-3 justify-content-center mb-3">
        {seeds.map((seed) => (
          <div
            key={seed}
            onClick={() =>
              setSelected({
                style,
                seed,
                format: "svg",
              })
            }
            className=""
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              overflow: "hidden",
              cursor: "pointer",
              border:
                selected?.seed === seed
                  ? "2px solid #0d6efd"
                  : "1px solid #444",
            }}
          >
            <img
              src={getUrl(style, seed)}
              alt="avatar"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "50%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Gombok */}
      <div className="d-flex justify-content-end gap-2">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
          disabled={saving}
        >
          Mégse
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving || !selected}
        >
          {saving ? "Mentés..." : "Mentés"}
        </button>
      </div>
    </UtomModal>
  );
}
