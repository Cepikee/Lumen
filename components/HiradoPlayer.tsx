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
  const [allowed, setAllowed] = useState(isPremium);

  const handlePlaying = async () => {
    if (allowed) return;

    const res = await fetch(`/api/hirado/can-watch?videoId=${video.id}`);
    const data = await res.json();

    if (!data.canWatch) {
      playerRef.current?.plyr?.pause();
      setShowPremiumModal(true);
      return;
    }

    setAllowed(true);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
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
          clickToPlay: true,
        }}
        onPlaying={handlePlaying}
      />

      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
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
