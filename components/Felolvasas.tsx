"use client";

import { useEffect, useState } from "react";

type FelolvasasProps = {
  videoId?: number;
};

export default function Felolvasas({ videoId }: FelolvasasProps) {
  const [text, setText] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showVolume, setShowVolume] = useState(false);

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
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
        window.speechSynthesis.cancel();
      }
    };
  }, [videoId]);

  const handleClick = () => {
    if (!text) return;

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
    utter.volume = volume;

    utter.onboundary = (event) => {
      utter.volume = volume;
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

  // Hangerő ikon logika
  const getVolumeIcon = () => {
    if (volume === 0) {
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#0dcaf0">
          <path d="M5 9v6h4l5 5V4l-5 5H5z" />
          <line x1="16" y1="8" x2="22" y2="14" stroke="#0dcaf0" strokeWidth="2"/>
          <line x1="22" y1="8" x2="16" y2="14" stroke="#0dcaf0" strokeWidth="2"/>
        </svg>
      );
    }
    if (volume < 0.5) {
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#0dcaf0">
          <path d="M5 9v6h4l5 5V4l-5 5H5z" />
          <path d="M16 10a2 2 0 0 1 0 4" stroke="#0dcaf0" strokeWidth="2" fill="none"/>
        </svg>
      );
    }
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#0dcaf0">
        <path d="M5 9v6h4l5 5V4l-5 5H5z" />
        <path d="M16 8a4 4 0 0 1 0 8" stroke="#0dcaf0" strokeWidth="2" fill="none"/>
      </svg>
    );
  };

  return (
    <div className="felolvasas-inline d-flex align-items-center gap-3">

      <img src="/felolvas.svg" width={22} height={22} alt="Felolvasás" />

      <button onClick={handleClick} className="btn btn-primary rounded-circle p-2 player-btn">
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

      <span className="felolvasas-text">Felolvasás</span>

      <div className="progress" style={{ width: "140px" }}>
        <div
          className="progress-bar bg-info"
          role="progressbar"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="volume-wrapper">
        <div onClick={() => setShowVolume(!showVolume)} style={{ cursor: "pointer" }}>
          {getVolumeIcon()}
        </div>

        {showVolume && (
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => {
              setVolume(Number(e.target.value));
              setShowVolume(false);
            }}
            className="volume-slider"
          />
        )}
      </div>
    </div>
  );
}
