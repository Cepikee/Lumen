// app/adatvedelem/layout.tsx
"use client";

import React from "react";
import "./adatvedelmi.css"; // <-- saját stílus, nem premium.css

export default function AdatvedelmiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="adatvedelmi-wrapper">
      {children}
    </div>
  );
}
