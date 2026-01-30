"use client";

import { useEffect, useState } from "react";

type FelolvasasProps = {
  videoId?: number;
};

export default function Felolvasas({ videoId }: FelolvasasProps) {
  const [text, setText] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1

  useEffect(() => {
    if (!videoId || videoId <= 0) {
      setText("");
      setProgress(0);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/hirado/read/${videoId}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          if (!cancelled) {
            setText("");
            setProgress(0);
          }
          return;
        }

        const data = await res.json();

        if (!cancelled && data?.hasReport && data?.content) {
          const plain = String(data.content).replace(/<[^>]+>/g, " ");
          setText(plain.trim());
          setProgress(0);
        } else if (!cancelled) {
          setText("");
          setProgress(0);
        }
      } catch {
        if (!cancelled) {
          setText("");
          setProgress(0);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [videoId]);

  const handleClick = () => {
    if (!text) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      setProgress(0);
      return;
    }

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "hu-HU";
    utter.rate = 1;
    utter.pitch = 1;

    utter.onboundary = (event: SpeechSynthesisEvent) => {
      if (!text.length) return;
      const ratio = Math.min(1, event.charIndex / text.length);
      setProgress(ratio);
    };

    utter.onend = () => {
      setIsReading(false);
      setProgress(1);
      setTimeout(() => setProgress(0), 800);
    };

    utter.onerror = () => {
      setIsReading(false);
      setProgress(0);
    };

    setIsReading(true);
    setProgress(0);
    window.speechSynthesis.speak(utter);
  };

  if (!text) return null;

  return (
    <div className="sticky top-4 z-30 flex justify-end">
      {/* floating mini-player card */}
      <div className="relative rounded-xl bg-slate-900/80 text-slate-50 shadow-lg shadow-slate-900/40 border border-slate-700/70 px-4 py-3 flex items-center gap-4 backdrop-blur-md max-w-md w-full">
        {/* play/stop button with icon */}
        <button
          onClick={handleClick}
          className="flex items-center gap-2 rounded-full bg-blue-500 hover:bg-blue-600 active:scale-95 transition-all duration-150 px-4 py-2 font-semibold text-sm shadow-md shadow-blue-500/40"
        >
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-900/60">
            {isReading ? (
              // stop icon
              <svg
                viewBox="0 0 24 24"
                className="w-3 h-3 fill-current"
                aria-hidden="true"
              >
                <rect x="6" y="6" width="12" height="12" rx="1.5" />
              </svg>
            ) : (
              // play icon
              <svg
                viewBox="0 0 24 24"
                className="w-3 h-3 fill-current"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </span>
          <span>{isReading ? "Felolvasás leállítása" : "Híradó felolvasása"}</span>
        </button>

        {/* waveform + progress area */}
        <div className="flex-1 flex flex-col gap-2">
          {/* animated waveform */}
          <div className="flex items-end gap-[3px] h-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`w-[3px] rounded-full bg-cyan-400/80 ${
                  isReading ? "animate-pulse" : "opacity-40"
                }`}
                style={{
                  height: isReading ? `${6 + i * 4}px` : "6px",
                  animationDelay: `${i * 80}ms`,
                }}
              />
            ))}
          </div>

          {/* progress bar */}
          <div className="w-full h-1.5 rounded-full bg-slate-700/80 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 transition-[width] duration-150"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
