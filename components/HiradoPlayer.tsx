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
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.25s_ease-out]">

    <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-2xl shadow-2xl max-w-sm w-full px-8 py-10 text-center animate-[popIn_0.25s_ease-out]">

      {/* SVG ikon */}
      <img
        src="/sad.svg"
        alt="Sad face"
        className="w-20 h-20 mx-auto mb-5 opacity-90"
      />

      {/* Cím */}
      <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
        Prémium szükséges
      </h2>

      {/* Leírás */}
      <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-8 leading-relaxed">
        A mai híradót már megnézted.<br />
        A további megtekintéshez Prémium előfizetés szükséges.
      </p>

      {/* Gomb */}
      <button
        onClick={() => (window.location.href = "/premium")}
        className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 rounded-full text-sm font-semibold shadow-md hover:scale-[1.04] active:scale-[0.98] transition-transform"
      >
        Prémium előfizetés
      </button>
    </div>

  </div>
)}


    </div>
  );
}
