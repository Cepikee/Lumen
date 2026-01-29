"use client";

import { useState, useEffect } from "react";
import { Plyr } from "plyr-react";
import "plyr-react/plyr.css";

export type HiradoPlayerProps = {
  video: {
    id: number;
    title?: string;
    created_at?: string;
    date?: string;
    video_date?: string;
    thumbnailUrl?: string;
  };
  isPremium: boolean;
  videoUrl: string;
};

export default function HiradoPlayer({
  video,
  isPremium,
  videoUrl,
}: HiradoPlayerProps) {
  const [blocked, setBlocked] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const [reportText, setReportText] = useState("");
  const [isReading, setIsReading] = useState(false);

  const videoSrc = String(videoUrl);

  const videoDate =
    video.date ||
    video.created_at ||
    video.video_date ||
    null;

  useEffect(() => {
    if (!videoDate) return;

    (async () => {
      try {
        const res = await fetch(`/api/hirado/read/${videoDate}`);
        const data = await res.json();

        if (data.hasReport && data.content) {
          const plain = data.content.replace(/<[^>]+>/g, " ");
          setReportText(plain);
        }
      } catch {}
    })();
  }, [videoDate]);

  const handleRead = () => {
    if (!("speechSynthesis" in window)) return;

    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    const utter = new SpeechSynthesisUtterance(reportText);
    utter.lang = "hu-HU";
    utter.rate = 1;
    utter.pitch = 1;

    utter.onend = () => setIsReading(false);

    setIsReading(true);
    window.speechSynthesis.speak(utter);
  };

  const handleTimeUpdate = async () => {
    if (blocked) return;
    if (isPremium) return;

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
        source={{
          type: "video",
          sources: [
            {
              src: videoSrc,
              type: "video/mp4",
            },
          ],
        }}
        options={{
          controls: [
            "play",
            "progress",
            "current-time",
            "mute",
            "volume",
            "fullscreen",
          ],
        }}
        onTimeUpdate={handleTimeUpdate}
      />

      {reportText && (
        <button
          onClick={handleRead}
          className="btn btn-primary mt-3"
          style={{ width: "100%", fontWeight: 600 }}
        >
          {isReading ? "Felolvasás leállítása" : "Híradó felolvasása"}
        </button>
      )}

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
              color: "#fff",
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
                }}
              />
            </div>

            <div style={{ flex: 1, textAlign: "center" }}>
              <h2 style={{ fontWeight: 700, fontSize: "1.4rem" }}>
                Prémium tartalom
              </h2>

              <p style={{ fontSize: "0.95rem", color: "#e0e0e0" }}>
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
                  borderRadius: "999px",
                  padding: "0.75rem 1.2rem",
                  fontWeight: 700,
                  color: "#111",
                }}
              >
                Prémium feloldása
              </button>

              <button
                className="btn btn-link"
                style={{
                  color: "#ccc",
                  fontSize: "0.8rem",
                }}
                onClick={() => (window.location.href = "/")}
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
