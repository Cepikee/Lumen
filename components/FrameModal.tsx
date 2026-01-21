"use client";

import { useState } from "react";
import UtomModal from "@/components/UtomModal";
import { useUserStore } from "@/store/useUserStore";
import { PREMIUM_FRAMES } from "@/types/premiumFrames";
import type { User } from "@/types/User";

function getAvatarUrl(user: User) {
  const style = user.avatar_style || "bottts";
  const seed = encodeURIComponent(user.avatar_seed || user.nickname);
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`;
}

export default function FrameModal({
  show,
  onClose,
}: {
  show: boolean;
  onClose: () => void;
}) {
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);

  const [selected, setSelected] = useState<string>(user?.avatar_frame || "");
  const [saving, setSaving] = useState(false);

  if (!user) return null;
  const u = user; // biztosítjuk a TS-nek, hogy user nem null

  async function handleSave() {
    if (!selected) return;
    setSaving(true);

    try {
      const res = await fetch("/api/user/frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_frame: selected }),
      });

      const data = await res.json();

      if (data.success) {
        // egyszerű, típushelyes frissítés: spread + típusassert
        setUser({ ...u, avatar_frame: selected } as User);

        onClose();
      } else {
        alert("Hiba történt: " + (data?.message ?? "Ismeretlen hiba"));
      }
    } catch (e) {
      alert("Váratlan hiba történt.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <UtomModal show={show} onClose={onClose} title="Prémium keret választása">
      <div className="d-flex flex-column gap-3">
        {PREMIUM_FRAMES.map((frame) => (
          <div
            key={frame.id}
            onClick={() => setSelected(frame.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "10px",
              borderRadius: "8px",
              cursor: "pointer",
              border: selected === frame.id ? "2px solid #0d6efd" : "1px solid #444",
              background: selected === frame.id ? "rgba(13,110,253,0.1)" : "transparent",
            }}
          >
            <div style={{ position: "relative", width: "54px", height: "54px" }}>
              <img
                src={getAvatarUrl(u)}
                alt="avatar"
                style={{
                  width: "54px",
                  height: "54px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  position: "relative",
                  zIndex: 2,
                }}
              />

              {frame.type === "css" && (
                <div
                  className={frame.className}
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
                />
              )}

              {frame.type === "png" && (
                <img
                  src={frame.src}
                  className={frame.className}
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

            <div style={{ fontWeight: 500 }}>{frame.label}</div>
          </div>
        ))}

        <div className="d-flex justify-content-end gap-2 mt-3">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Mégse
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !selected}
          >
            {saving ? "Mentés..." : "Mentés"}
          </button>
        </div>
      </div>
    </UtomModal>
  );
}
