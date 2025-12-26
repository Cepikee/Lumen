"use client";

interface SidebarToggleFloatingProps {
  onOpen: () => void;
  isOpen: boolean;
}

export default function SidebarToggleFloating({ onOpen, isOpen }: SidebarToggleFloatingProps) {
  const left = isOpen ? 240 : 0; // állítsd be a Sidebar szélességét

  return (
    <button
      onClick={onOpen}   // <-- EBBŐL LESZ TOGGLE, LENT MEGMUTATOM
      aria-label="Menü megnyitása"
      title="Menü"
      style={{
        position: "fixed",
        top: "50%",
        left: `${left}px`,
        transform: "translateY(-50%)",
        width: "42px",
        height: "42px",
        borderRadius: "0 8px 8px 0",
        border: "none",
        background: "#111",
        color: "#fff",
        cursor: "pointer",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "2px 4px 12px rgba(0,0,0,0.25)",
        transition: "left 0.3s ease",
      }}
    >
      ☰
    </button>
  );
}
