"use client";

import { useRef, useState } from "react";
import { Plyr } from "plyr-react";
import "plyr-react/plyr.css";

type HiradoPlayerProps = {
  video: {
    id: number;
    fileUrl: string;
  };
};

export default function HiradoPlayer({ video }: HiradoPlayerProps) {
  const playerRef = useRef<any>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [allowed, setAllowed] = useState(false);

  const handlePlay = async () => {
    if (allowed) return;

    const res = await fetch(`/api/hirado/can-watch?videoId=${video.id}`);
    const data = await res.json();

    if (!data.canWatch && data.reason === "PREMIUM_REQUIRED") {
      setShowPremiumModal(true);
      playerRef.current?.plyr?.pause();
      return;
    }

    if (data.canWatch) {
      setAllowed(true);
      return;
    }
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
        }}
        onPlay={handlePlay}
      />

      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-xl max-w-sm">
            <h2 className="text-xl font-bold mb-3">Prémium szükséges</h2>
            <p className="mb-4">
              A mai híradót egyszer már megnézted. A további megtekintéshez
              Prémium szükséges.
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
