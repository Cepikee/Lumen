"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored ?? (systemDark ? "dark" : "light");
    setTheme(initial);
    document.documentElement.setAttribute("data-bs-theme", initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-bs-theme", next);
  };

  return (
    <button onClick={toggleTheme} className="btn btn-outline-secondary">
      {theme === "light" ? "🌙 Sötét mód" : "☀️ Világos mód"}
    </button>
  );
}
