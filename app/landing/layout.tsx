// app/landing/layout.tsx
import React from "react";

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing-page">
      {children}
    </div>
  );
}
