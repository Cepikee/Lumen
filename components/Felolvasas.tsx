"use client";

import { useEffect, useState } from "react";

export default function Felolvasas({ date }: { date: string }) {
  const [reportText, setReportText] = useState("");
  const [isReading, setIsReading] = useState(false);

  // 🔥 Lekérés az API-ból
  useEffect(() => {
    if (!date) return;

    (async () => {
      try {
        const res = await fetch(`/api/hirado/read/${date}`);
        const data = await res.json();

        if (data.hasReport && data.content) {
          const plain = data.content.replace(/<[^>]+>/g, " ");
          setReportText(plain);
        }
      } catch {}
    })();
  }, [date]);

  // 🔥 Felolvasás
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

  // 🔥 Ha nincs szöveg → nincs gomb
  if (!reportText) return null;

  return (
    <button
      onClick={handleRead}
      className="btn btn-primary mt-3"
      style={{ width: "100%", fontWeight: 600 }}
    >
      {isReading ? "Felolvasás leállítása" : "Híradó felolvasása"}
    </button>
  );
}
