// lib/useInView.ts
import { useEffect, useRef, useState } from "react";

export function useInView(threshold = 0.2) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setInView(true);
        });
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref.current]);

  return { ref, inView };
}
