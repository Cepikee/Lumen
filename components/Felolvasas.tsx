"use client";

import { useEffect, useState } from "react";

export default function Felolvasas() {
  const [reportText, setReportText] = useState("");
  const [isReading, setIsReading] = useState(false);

  const date =
    typeof window !== "undefined"
      ? window.location.pathname.split("/").pop() ||
        new URLSearchParams(window.location.search).get("video") ||
        ""
      : "";

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
