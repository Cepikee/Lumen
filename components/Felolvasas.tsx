"use client";

import { useEffect, useState } from "react";

export default function Felolvasas({ videoId }: { videoId?: number }) {
  const [reportText, setReportText] = useState("");
  const [isReading, setIsReading] = useState(false);

  useEffect(() => {
    if (!videoId) return;

    (async () => {
      try {
        const res = await fetch(`/api/hirado/read/${videoId}`);
        const data = await res.json();

        if (data.hasReport && data.content) {
          const plain = data.content.replace(/<[^>]+>/g, " ");
          setReportText(plain);
        }
      } catch {}
    })();
  }, [videoId]);

  const handleRead = () => {
    if (!("speechSynthesis" in window)) return;

    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    const utter = new SpeechSynthesisUtterance(reportText);
    utter.lang = "hu-HU";
    utter.rate = 1;
    utter.pitch = 1;

    utter.onend = () => setIsReading(false);

    setIsReading(true);
    window.speechSynthesis.speak(utter);
  };

  if (!reportText) return null;

  return (
    <button
      onClick={handleRead}
      className="btn btn-primary"
      style={{ fontWeight: 600 }}
    >
      {isReading ? "Felolvasás leállítása" : "Híradó felolvasása"}
    </button>
  );
}
