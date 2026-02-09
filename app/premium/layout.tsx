// app/premium/layout.tsx
import React from "react";

export default function PremiumLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="premium-wrapper">
      {children}
    </div>
  );
}
