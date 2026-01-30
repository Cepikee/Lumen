"use client";

import { useEffect, useRef, useState } from "react";

type Props = { videoId?: number };

export default function Felolvasas({ videoId }: Props) {
  const [textAvailable, setTextAvailable] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [volume, setVolume] = useState(1); // 0..1
  const [showSlider, setShowSlider] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  // Ellenőrizzük, hogy van-e tartalom (szerver oldali endpoint dönti el)
  useEffect(() => {
    if (!videoId) {
      setTextAvailable(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/hirado/read/${videoId}`, { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setTextAvailable(false);
          return;
        }
        const data = await res.json();
        if (!cancelled && data?.hasReport) setTextAvailable(true);
        else if (!cancelled) setTextAvailable(false);
      } catch {
        if (!cancelled) setTextAvailable(false);
      }
    })();
    return () => { cancelled = true; };
  }, [videoId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAndCleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initAudioChain = async (blob: Blob) => {
    // cleanup previous
    stopAndCleanup();

    // create audio element
    const audio = document.createElement("audio");
    audio.src = URL.createObjectURL(blob);
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    // create AudioContext and nodes
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    ctxRef.current = ctx;
    const source = ctx.createMediaElementSource(audio);
    sourceRef.current = source;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    gainRef.current = gain;

    // connect: source -> gain -> destination
    source.connect(gain);
    gain.connect(ctx.destination);

    // resume context on user gesture if suspended
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch {}
    }

    // when audio ends
    audio.onended = () => {
      setIsPlaying(false);
    };

    return audio;
  };

  const fetchAndPlay = async () => {
    if (!videoId) return;
    try {
      // endpoint should return audio blob (mp3/wav)
      const res = await fetch(`/api/hirado/tts/${videoId}`, { cache: "no-store" });
      if (!res.ok) {
        console.error("TTS endpoint hiba");
        return;
      }
      const blob = await res.blob();
      const audio = await initAudioChain(blob);
      if (!audio) return;

      // play
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("Hiba a lejátszásnál:", err);
    }
  };

  const stopAndCleanup = () => {
    // stop audio element
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        URL.revokeObjectURL(audioRef.current.src);
      } catch {}
      audioRef.current.onended = null;
      audioRef.current = null;
    }
    // disconnect nodes
    try {
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (gainRef.current) {
        gainRef.current.disconnect();
        gainRef.current = null;
      }
      if (ctxRef.current) {
        // close context to free resources
        ctxRef.current.close().catch(() => {});
        ctxRef.current = null;
      }
    } catch {}
    setIsPlaying(false);
  };

  const togglePlay = async () => {
    if (isPlaying) {
      stopAndCleanup();
      return;
    }
    // start: fetch audio and play
    await fetchAndPlay();
  };

  // Élő hangerőfrissítés: a slider oninput eseményére azonnal állítjuk a gain értékét
  const handleVolumeChange = (v: number) => {
    setVolume(v);
    if (gainRef.current) {
      gainRef.current.gain.setValueAtTime(v, gainRef.current.context.currentTime);
    }
    // ha nincs még audio, csak beállítjuk a default értéket (induláskor használja)
  };

  // dupla kattintás: mute/unmute
  const toggleMute = () => {
    const newVol = volume === 0 ? 1 : 0;
    handleVolumeChange(newVol);
  };

  if (!textAvailable) return null;

  return (
    <div className="felolvasas-inline d-flex align-items-center gap-3">
      {/* Kicsi gombból nyílik a nagy mód */}
      {!expanded ? (
        <button className="felolvasas-small-btn" onClick={() => setExpanded(true)}>
          <img src="/felolvas.svg" width={20} height={20} alt="Felolvasás" />
          <span>Felolvasás</span>
        </button>
      ) : (
        <>
          {/* Play / Stop */}
          <button onClick={togglePlay} className="btn btn-primary rounded-circle p-2 player-btn" aria-pressed={isPlaying}>
            {isPlaying ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>

          {/* Hangerő ikon + slider (vízszintes, egyvonalban) */}
          <div className="volume-wrapper" onDoubleClick={toggleMute}>
            <div className="volume-icon" onClick={() => setShowSlider((s) => !s)} style={{ cursor: "pointer" }}>
              {/* ikon változtatása a volume alapján */}
              {volume === 0 ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#0dcaf0"><path d="M5 9v6h4l5 5V4l-5 5H5z" /><line x1="16" y1="8" x2="22" y2="14" stroke="#0dcaf0" strokeWidth="2"/><line x1="22" y1="8" x2="16" y2="14" stroke="#0dcaf0" strokeWidth="2"/></svg>
              ) : volume < 0.5 ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#0dcaf0"><path d="M5 9v6h4l5 5V4l-5 5H5z" /><path d="M16 10a2 2 0 0 1 0 4" stroke="#0dcaf0" strokeWidth="2" fill="none"/></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#0dcaf0"><path d="M5 9v6h4l5 5V4l-5 5H5z" /><path d="M16 8a4 4 0 0 1 0 8" stroke="#0dcaf0" strokeWidth="2" fill="none"/></svg>
              )}
            </div>

            {/* Slider mindig vízszintes és egyvonalban az ikonnal */}
            {showSlider && (
              <input
                className="volume-slider-horizontal"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onInput={(e) => handleVolumeChange(Number((e.target as HTMLInputElement).value))}
                onMouseDown={() => { /* ne zárjuk be közben */ }}
                onMouseUp={() => { /* opcionálisan bezárhatjuk: setShowSlider(false) */ }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
