"use client";

import { useRef, useState } from "react";
import { Plyr } from "plyr-react";
import "plyr-react/plyr.css";

type HiradoPlayerProps = {
  video: {
    id: number;
    fileUrl: string;
  };
  isPremium: boolean;
};

export default function HiradoPlayer({ video, isPremium }: HiradoPlayerProps) {
  const playerRef = useRef<any>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const handleStartClick = async () => {
    if (!playerRef.current) return;
    if (isStarting) return;

    // Prémium user → mindig engedjük
    if (isPremium) {
      setIsStarting(true);
      await playerRef.current.plyr.play();
      setIsStarting(false);
      return;
    }

    setIsStarting(true);

    try {
      const res = await fetch(`/api/hirado/can-watch?videoId=${video.id}`);
      const data = await res.json();

      if (!data.canWatch) {
        setShowPremiumModal(true);
        setIsStarting(false);
        return;
      }

      // Ha nézheti → elindítjuk a lejátszást
      await playerRef.current.plyr.play();
    } catch (e) {
      console.error("HIRADO START ERROR", e);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto relative">
      <Plyr
        ref={playerRef}
        source={{
          type: "video",
          sources: [
            {
              src: video.fileUrl,
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
          clickToPlay: false, // ← NEM engedjük, hogy a videóra kattintva induljon
        }}
      />

      {/* Saját overlay Play gomb – mindig ezen keresztül indul a videó */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <button
          onClick={handleStartClick}
          className="pointer-events-auto bg-black/70 text-white px-6 py-3 rounded-full text-lg font-semibold shadow-lg hover:bg-black/80 transition"
        >
          {isStarting ? "Ellenőrzés..." : "Híradó indítása"}
        </button>
      </div>

      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-xl max-w-sm">
            <h2 className="text-xl font-bold mb-3">Prémium szükséges</h2>
            <p className="mb-4">
              A mai híradót már megnézted. A további megtekintéshez Prémium
              előfizetés szükséges.
            </p>
            <button
              onClick={() => (window.location.href = "/premium")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Prémium előfizetés
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
