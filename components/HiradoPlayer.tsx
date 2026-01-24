"use client";

import { useRef, useState } from "react";
import { Plyr } from "plyr-react";
import "plyr-react/plyr.css";

type HiradoPlayerProps = {
  video: {
    id: number;
    fileUrl: string;
  };
  isPremium: boolean; // maradhat, de nem használjuk döntésre
};

export default function HiradoPlayer({ video }: HiradoPlayerProps) {
  const playerRef = useRef<any>(null);
  const [blocked, setBlocked] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // 🔥 MINDIG a backend dönti el, nézheted-e
  const handleTimeUpdate = async () => {
    if (blocked) return;

    const res = await fetch(`/api/hirado/can-watch?videoId=${video.id}`, {
      credentials: "include",
    });

    const data = await res.json();

    if (!data.canWatch) {
      setBlocked(true);
      setShowPremiumModal(true);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Plyr
        ref={playerRef}
        source={
          blocked
            ? { type: "video", sources: [] }
            : {
                type: "video",
                sources: [
                  {
                    src: video.fileUrl,
                    type: "video/mp4",
                  },
                ],
              }
        }
        options={{
          controls: [
            "play",
            "progress",
            "current-time",
            "mute",
            "volume",
            "fullscreen",
          ],
          clickToPlay: true,
        }}
        onTimeUpdate={handleTimeUpdate}
      />

      {showPremiumModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1055,
            animation: "fadeIn 0.25s ease-out",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "2rem",
              width: "100%",
              maxWidth: "680px",
              padding: "2.8rem",
              borderRadius: "24px",
              background: "#1d2e4a",
              boxShadow: "0 0 40px rgba(80,150,255,0.1)",
              color: "#fff",
              animation: "popIn 0.25s ease-out",
            }}
          >
            <div style={{ flex: "0 0 180px" }}>
              <img
                src="/icons/premium.png"
                alt="Prémium szükséges"
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: "16px",
                  boxShadow: "0 0 12px rgba(255,255,255,0.08)",
                  animation: "floatIn 0.4s ease-out",
                }}
              />
            </div>

            <div style={{ flex: 1, textAlign: "center" }}>
              <h2
                style={{
                  fontWeight: 700,
                  fontSize: "1.4rem",
                  marginBottom: "0.75rem",
                }}
              >
                Prémium tartalom
              </h2>

              <p
                style={{
                  fontSize: "0.95rem",
                  color: "#e0e0e0",
                  lineHeight: 1.6,
                  marginBottom: "1.8rem",
                }}
              >
                A mai híradót már megnézted.
                <br />
                A további megtekintéshez{" "}
                <span style={{ color: "#ffb4b4", fontWeight: 600 }}>
                  Prémium előfizetés
                </span>{" "}
                szükséges.
              </p>

              <button
                className="btn w-100"
                onClick={() => (window.location.href = "/premium")}
                style={{
                  background: "linear-gradient(135deg, #ffb4b4, #ffdddd)",
                  border: "none",
                  borderRadius: "999px",
                  padding: "0.75rem 1.2rem",
                  fontWeight: 700,
                  color: "#111",
                  boxShadow: "0 6px 18px rgba(255,180,180,0.2)",
                  transition: "transform 0.15s ease",
                  marginBottom: "0.75rem",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.transform = "scale(1.04)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                Prémium feloldása
              </button>

              <button
                className="btn btn-link"
                style={{
                  color: "#ccc",
                  fontSize: "0.8rem",
                  display: "block",
                  margin: "0 auto",
                }}
                onClick={() => (window.location.href = "https://utom.hu/")}
              >
                Vissza a főoldalra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
