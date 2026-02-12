// app/aszf/layout.tsx
"use client";

import React from "react";
import "./aszf.css"; // <-- saját stílus, nem premium.css

export default function ASZFLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="aszf-wrapper">
      {children}
    </div>
  );
}
