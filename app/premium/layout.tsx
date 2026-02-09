// app/premium/layout.tsx
import React from "react";
import "../premium/premium.css"; // <-- EZ FONTOS

export default function PremiumLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="premium-wrapper">
      {children}
    </div>
  );
}
