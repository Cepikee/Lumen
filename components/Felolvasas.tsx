"use client";

import { useEffect, useRef, useState } from "react";

type FelolvasasProps = {
  videoId?: number;
};

export default function Felolvasas({ videoId }: FelolvasasProps) {
  const [text, setText] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolume, setShowVolume] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // 🔥 Itt tároljuk az aktuálisan futó utterance példányt
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  // --- FETCH ---
  useEffect(() => {
    if (!videoId || videoId <= 0) {
      setText("");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/hirado/read/${videoId}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          if (!cancelled) setText("");
          return;
        }

        const data = await res.json();

        if (!cancelled && data?.hasReport && data?.content) {
          const plain = String(data.content).replace(/<[^>]+>/g, " ");
          setText(plain.trim());
        } else if (!cancelled) {
          setText("");
        }
      } catch {
        if (!cancelled) setText("");
      }
    })();

    return () => {
      cancelled = true;
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [videoId]);

  // --- PLAY / STOP ---
  const startReading = () => {
    if (!text) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "hu-HU";
    utter.rate = 1;
    utter.pitch = 1;
    utter.volume = volume; // induló hangerő

    utter.onend = () => {
      setIsReading(false);
      utterRef.current = null;
    };

    utterRef.current = utter; // 🔥 eltároljuk
    setIsReading(true);
    window.speechSynthesis.speak(utter);
  };

  const stopReading = () => {
    window.speechSynthesis.cancel();
    utterRef.current = null;
    setIsReading(false);
  };

  const handleClick = () => {
    if (isReading) stopReading();
    else startReading();
  };

  // --- HANGERŐ IKON ---
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

  // --- KICSI MÓD ---
  if (!expanded) {
    return (
      <button
        className="felolvasas-small-btn"
        onClick={() => setExpanded(true)}
      >
        <img src="/felolvas.svg" width={20} height={20} />
        <span>Felolvasás</span>
      </button>
    );
  }

  // --- NAGY MÓD ---
  return (
    <div className="felolvasas-inline d-flex align-items-center gap-3">

      {/* Play / Stop */}
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

      {/* Hangerő */}
      <div className="volume-wrapper">

        {/* ikon + dupla kattintás = mute/unmute */}
        <div
          onClick={() => setShowVolume(!showVolume)}
          onDoubleClick={() => {
            const newVol = volume === 0 ? 1 : 0;
            setVolume(newVol);
            if (utterRef.current) utterRef.current.volume = newVol; // 🔥 élő frissítés
          }}
          style={{ cursor: "pointer" }}
        >
          {getVolumeIcon()}
        </div>

        {/* vízszintes slider */}
        {showVolume && (
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => {
              const newVol = Number(e.target.value);
              setVolume(newVol);

              // 🔥 ÉLŐBEN frissítjük a hangerőt
              if (utterRef.current) {
                utterRef.current.volume = newVol;
              }
            }}
            className="volume-slider-horizontal"
          />
        )}
      </div>
    </div>
  );
}
