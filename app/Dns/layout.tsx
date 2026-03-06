// app/dns/layout.tsx
"use client";

import React from "react";
export default function DnsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dns-wrapper">
      {children}
    </div>
  );
}
