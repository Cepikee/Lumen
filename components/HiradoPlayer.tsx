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
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-2xl max-w-sm text-center">
      
      {/* 😢 Szomorú emoji vagy SVG */}
      <div className="text-6xl mb-4">😢</div>

      {/* Cím */}
      <h2 className="text-2xl font-bold mb-2">Prémium szükséges</h2>

      {/* Magyarázó szöveg */}
      <p className="text-base opacity-80 mb-6">
        A mai híradót már megnézted. A további megtekintéshez Prémium előfizetés szükséges.
      </p>

      {/* Gomb */}
      <button
        onClick={() => (window.location.href = "/premium")}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-full text-sm font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700 transition"
      >
        Prémium előfizetés
      </button>
    </div>
  </div>
)}

    </div>
  );
}
