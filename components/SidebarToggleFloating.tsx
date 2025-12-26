"use client";

interface SidebarToggleFloatingProps {
  onOpen: () => void;
}

export default function SidebarToggleFloating({ onOpen }: SidebarToggleFloatingProps) {
  return (
    <button
      onClick={onOpen}
      aria-label="Menü megnyitása"
      title="Menü"
      style={{
        position: "fixed",
        top: "50%",
        left: "0",
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
      }}
    >
      ☰
    </button>
  );
}
