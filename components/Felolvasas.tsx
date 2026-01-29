"use client";

import { useEffect, useState } from "react";

type FelolvasasProps = {
  videoId?: number;
};

export default function Felolvasas({ videoId }: FelolvasasProps) {
  const [text, setText] = useState<string>("");
  const [isReading, setIsReading] = useState(false);
  const [status, setStatus] = useState<string>("idle");

  useEffect(() => {
    console.log("Felolvasas mounted or videoId changed", { videoId });
    setStatus("checking videoId");

    if (!videoId || videoId <= 0) {
      console.log("Invalid videoId, aborting fetch", { videoId });
      setText("");
      setStatus("no-videoId");
      return;
    }

    let cancelled = false;
    setStatus("fetching");

    (async () => {
      try {
        const url = `/api/hirado/read/${videoId}`;
        console.log("Fetching URL", url);
        const res = await fetch(url, { cache: "no-store" });
        console.log("Fetch response", res.status, res.statusText);

        if (!res.ok) {
          console.warn("Fetch not ok", res.status);
          if (!cancelled) {
            setText("");
            setStatus(`fetch-error-${res.status}`);
          }
          return;
        }

        const data = await res.json();
        console.log("Fetch JSON", data);

        if (!cancelled && data?.hasReport && data?.content) {
          const plain = String(data.content).replace(/<[^>]+>/g, " ");
          setText(plain.trim());
          setStatus("has-report");
        } else if (!cancelled) {
          setText("");
          setStatus("no-report");
        }
      } catch (err) {
        console.error("Fetch exception", err);
        if (!cancelled) {
          setText("");
          setStatus("fetch-exception");
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
      return;
    }

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "hu-HU";
    utter.rate = 1;
    utter.pitch = 1;
    utter.onend = () => setIsReading(false);

    setIsReading(true);
    window.speechSynthesis.speak(utter);
  };

  return (
    <div style={{ border: "1px dashed red", padding: 8 }}>
      <div style={{ fontSize: 12, color: "#333" }}>
        <strong>Debug Felolvasas</strong>
      </div>

      <div style={{ fontSize: 12 }}>
        <div>videoId: <code>{String(videoId)}</code></div>
        <div>status: <code>{status}</code></div>
        <div>hasText: <code>{text ? "yes" : "no"}</code></div>
      </div>

      {text ? (
        <div style={{ marginTop: 8 }}>
          <button onClick={handleClick} style={{ fontWeight: 600 }}>
            {isReading ? "Felolvasás leállítása" : "Híradó felolvasása"}
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
          Nincs szöveg a felolvasáshoz
        </div>
      )}
    </div>
  );
}
