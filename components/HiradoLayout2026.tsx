"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/store/useUserStore";
import HiradoPlayerWrapper from "@/app/hirado/HiradoPlayerWrapper";
import HiradoArchiveSlider from "@/components/HiradoArchiveSlider";

type HiradoLayoutProps = {
  video?: { id: number; fileUrl: string; title?: string; date?: string };
  user: { is_premium: number };
};

export default function HiradoLayout2026({ video, user }: HiradoLayoutProps) {
  const today = new Date().toLocaleDateString("hu-HU");

  const theme = useUserStore((s) => s.theme);

  const [systemTheme, setSystemTheme] = useState<"dark" | "light">(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) =>
      setSystemTheme(e.matches ? "dark" : "light");

    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);

  const activeTheme = theme === "system" ? systemTheme : theme;

  // 🔥 BIZTONSÁGOS VIDEO OBJEKTUM
  const safeVideo = video ?? { id: 0, fileUrl: "" };

  return (
    <div>
      <header>
        <div>Utom Híradó</div>
        <div>{today}</div>
      </header>

      <main>
        <div>
          <div>
            <div>
              <HiradoPlayerWrapper
                video={safeVideo}
                isPremium={user?.is_premium === 1}
              />
            </div>
          </div>

          <footer>
            <div>
              <h2>Archívum</h2>
              <div>
                <HiradoArchiveSlider />
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
