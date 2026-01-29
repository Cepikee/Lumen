"use client";
import { useEffect, useState } from "react";

export default function Felolvasas({ videoId }: { videoId?: number }) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!videoId) return;

    fetch(`/api/hirado/read/${videoId}`)
      .then(r => r.json())
      .then(d => {
        if (d.hasReport && d.content) {
          setText(d.content.replace(/<[^>]+>/g, " "));
        }
      });
  }, [videoId]);

  if (!text) return null;

  const read = () => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "hu-HU";
    speechSynthesis.speak(u);
  };

  return (
    <button onClick={read}>
      Híradó felolvasása
    </button>
  );
}
