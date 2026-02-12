// app/aszf/layout.tsx
"use client";

import React from "react";
import "./impresszum.css"; // <-- saját stílus, nem premium.css

export default function ImpresszumLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="impresszum-wrapper">
      {children}
    </div>
  );
}
