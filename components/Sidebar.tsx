"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const linkStyle = (path: string) => ({
    padding: "12px 16px",
    display: "block",
    borderRadius: "6px",
    background: pathname === path ? "rgba(0,0,0,0.1)" : "transparent",
    fontWeight: pathname === path ? 600 : 400,
    textDecoration: "none",
    color: "inherit",
    marginBottom: "6px",
  });

  return (
    <>
      {/* Háttér overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.25s ease",
          zIndex: 998,
        }}
      />

      {/* Oldalsáv */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "240px",
          height: "100vh",
          background: "var(--bs-body-bg)",
          borderRight: "1px solid rgba(0,0,0,0.1)",
          padding: "80px 16px 16px",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease",
          zIndex: 999,
        }}
      >
        <nav>
          <Link href="/" style={linkStyle("/")}>Nézet</Link>
          <Link href="/mi-tortent-ma" style={linkStyle("/mi-tortent-ma")}>Mi történt ma</Link>
          <Link href="/forrasok" style={linkStyle("/forrasok")}>Források</Link>
        </nav>
      </aside>
    </>
  );
}
