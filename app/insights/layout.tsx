// app/insightslayout.tsx
import React from "react";

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="insights-page">
      {children}
    </div>
  );
}
