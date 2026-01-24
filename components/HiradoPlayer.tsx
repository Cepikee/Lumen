"use client";

import { useRef, useState } from "react";
import { Plyr } from "plyr-react";
import "plyr-react/plyr.css";
<link
  href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css"
  rel="stylesheet"
/>

type HiradoPlayerProps = {
  video: {
    id: number;
    fileUrl: string;
  };
  isPremium: boolean;
};

export default function HiradoPlayer({ video, isPremium }: HiradoPlayerProps) {
  const playerRef = useRef<any>(null);
  const [blocked, setBlocked] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // 🔥 A Plyr minden 250ms-ben küldi a timeupdate-et → garantáltan lefut
  const handleTimeUpdate = async () => {
    if (isPremium) return;     // prémium user → szabad
    if (blocked) return;       // már tiltottuk → ne kérdezzen tovább

    const res = await fetch(`/api/hirado/can-watch?videoId=${video.id}`, {
      credentials: "include",
    });

    const data = await res.json();

    if (!data.canWatch) {
      // 🔥 A videó fizikai megszüntetése → kijátszhatatlan tiltás
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
            ? { type: "video", sources: [] } // 🔥 nincs forrás → nincs lejátszás
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
        onTimeUpdate={handleTimeUpdate} // 🔥 garantáltan lefut minden lejátszásnál
      />

    {showPremiumModal && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.65)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1055,
      animation: "fadeIn 0.25s ease-out",
    }}
  >
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "420px",
        padding: "2.8rem 2.4rem",
        borderRadius: "24px",
        textAlign: "center",
        background: "linear-gradient(145deg, #0f0f0f, #1a1a1a)",
        boxShadow:
          "0 0 80px rgba(255,200,120,0.18), inset 0 0 0 1px rgba(255,255,255,0.06)",
        color: "#fff",
        animation: "popIn 0.25s ease-out",
      }}
    >
      {/* MEDÚZA KÉP */}
      <img
        src="/premium.png"
        alt="Prémium szükséges"
        style={{
          width: "72px",
          height: "72px",
          margin: "0 auto 1.5rem",
          opacity: 0.9,
          animation: "floatIn 0.4s ease-out",
        }}
      />

      {/* TITLE */}
      <h2 style={{ fontWeight: 700, marginBottom: "0.75rem" }}>
        Prémium tartalom
      </h2>

      {/* TEXT */}
      <p
        style={{
          fontSize: "0.95rem",
          color: "#ccc",
          lineHeight: 1.6,
          marginBottom: "1.8rem",
        }}
      >
        A mai híradót már megnézted.
        <br />
        A további megtekintéshez{" "}
        <span style={{ color: "#f5c26b", fontWeight: 600 }}>
          Prémium előfizetés
        </span>{" "}
        szükséges.
      </p>

      {/* CTA */}
      <button
        className="btn w-100"
        onClick={() => (window.location.href = "/premium")}
        style={{
          background: "linear-gradient(135deg, #f5c26b, #ffdf9e)",
          border: "none",
          borderRadius: "999px",
          padding: "0.75rem",
          fontWeight: 700,
          color: "#111",
          boxShadow: "0 8px 25px rgba(255,215,130,0.4)",
          transition: "transform 0.15s ease",
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

      {/* SECONDARY */}
      <button
        className="btn btn-link mt-3"
        style={{ color: "#999", fontSize: "0.8rem" }}
        onClick={() => (window.location.href = "https://utom.hu/")}
      >
        Vissza a főoldalra
      </button>
    </div>

    {/* INLINE KEYFRAMES */}
    <style>
      {`
        @keyframes fadeIn {
          from { opacity: 0 }
          to { opacity: 1 }
        }
        @keyframes popIn {
          from { transform: scale(0.92); opacity: 0 }
          to { transform: scale(1); opacity: 1 }
        }
        @keyframes floatIn {
          from { transform: translateY(12px); opacity: 0 }
          to { transform: translateY(0); opacity: 1 }
        }
      `}
    </style>
  </div>
)}





    </div>
  );
}
