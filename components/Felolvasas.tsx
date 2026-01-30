"use client";

import { useEffect, useState } from "react";

type FelolvasasProps = {
  videoId?: number;
};

export default function Felolvasas({ videoId }: FelolvasasProps) {
  const [text, setText] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [progress, setProgress] = useState(0);

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
      const ratio = Math.min(1, event.charIndex / text.length);
      setProgress(ratio);
    };

    utter.onend = () => {
      setIsReading(false);
      setProgress(1);
      setTimeout(() => setProgress(0), 600);
    };

    setIsReading(true);
    setProgress(0);
    window.speechSynthesis.speak(utter);
  };

  if (!text) return null;

  return (
    <div className="felolvasas-inline d-flex align-items-center gap-3">

      {/* Play / Stop button */}
      <button onClick={handleClick} className="btn btn-primary rounded-circle p-2">
        {isReading ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Waveform */}
      <div className="waveform d-flex align-items-end gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`bar ${isReading ? "bar-anim" : ""}`}
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="progress flex-grow-1" style={{ width: "120px" }}>
        <div
          className="progress-bar bg-info"
          role="progressbar"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
