"use client";

import { useState, useEffect, useRef } from "react";
import { useUserStore } from "@/store/useUserStore";

type ThemeMode = "dark" | "system" | "light";

export default function ThemeSwitch() {
  // 🔥 GLOBAL THEME FROM ZUSTAND
  const theme = useUserStore((s) => s.theme);
  const setTheme = useUserStore((s) => s.setTheme);

  const [current, setCurrent] = useState<ThemeMode>("system");
  const requestSequence = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // 🔥 Ha a globális theme változik, frissítjük a kapcsolót
  useEffect(() => {
    if (theme) {
      setCurrent(theme);
    }
  }, [theme]);

  // 🔥 Csak globális theme frissítés (NINCS DOM MANIPULÁCIÓ)
  async function updateTheme(newTheme: ThemeMode) {
    const requestId = ++requestSequence.current;
    const previousTheme = useUserStore.getState().theme || "system";
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setCurrent(newTheme);
    setTheme(newTheme); // Zustand store frissítése

    // Backend update.  The click handler is not awaited by React, therefore
    // a rejected fetch must be consumed here rather than becoming an
    // unhandled Promise and leaving the UI in a false optimistic state.
    try {
      const res = await fetch("/api/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ theme: newTheme }),
      });
      if (!res.ok && requestId === requestSequence.current) {
        setCurrent(previousTheme);
        setTheme(previousTheme);
      }
    } catch (error) {
      if (requestId === requestSequence.current && !(error instanceof DOMException && error.name === "AbortError")) {
        setCurrent(previousTheme);
        setTheme(previousTheme);
      }
    }
  }

  // SLIDER ANIMÁCIÓ
  const sliderTransform =
    current === "dark"
      ? "translateX(0px)"
      : current === "system"
      ? "translateX(80px)"
      : "translateX(160px)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <span className="text-muted" style={{ fontSize: "14px" }}>
        Téma
      </span>

      <div
        style={{
          width: "240px",
          height: "48px",
          background: "#1f1f1f",
          borderRadius: "999px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 8px",
          position: "relative",
          boxShadow: "0 0 0 1px #333",
        }}
      >
        {/* CSÚSZKA */}
        <div
          style={{
            position: "absolute",
            top: "4px",
            left: "8px",
            width: "72px",
            height: "40px",
            borderRadius: "999px",
            background: "#333",
            transform: sliderTransform,
            transition: "transform 0.25s ease-in-out",
            boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
          }}
        />

        {/* SÖTÉT */}
        <div
          onClick={() => updateTheme("dark")}
          style={{
            position: "relative",
            zIndex: 1,
            width: "72px",
            textAlign: "center",
            color: current === "dark" ? "white" : "#888",
            fontSize: "18px",
            cursor: "pointer",
            userSelect: "none",
            transition: "color 0.2s",
          }}
        >
          🌙
          <div style={{ fontSize: "11px", marginTop: "2px" }}>Sötét</div>
        </div>

        {/* RENDSZER */}
        <div
          onClick={() => updateTheme("system")}
          style={{
            position: "relative",
            zIndex: 1,
            width: "72px",
            textAlign: "center",
            color: current === "system" ? "white" : "#888",
            fontSize: "18px",
            cursor: "pointer",
            userSelect: "none",
            transition: "color 0.2s",
          }}
        >
          🖥️
          <div style={{ fontSize: "11px", marginTop: "2px" }}>Rendszer</div>
        </div>

        {/* VILÁGOS */}
        <div
          onClick={() => updateTheme("light")}
          style={{
            position: "relative",
            zIndex: 1,
            width: "72px",
            textAlign: "center",
            color: current === "light" ? "white" : "#888",
            fontSize: "18px",
            cursor: "pointer",
            userSelect: "none",
            transition: "color 0.2s",
          }}
        >
          ☀️
          <div style={{ fontSize: "11px", marginTop: "2px" }}>Világos</div>
        </div>
      </div>
    </div>
  );
}
