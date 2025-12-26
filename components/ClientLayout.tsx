"use client";

import dynamic from "next/dynamic";
import Header from "./Header";
import CookieConsent from "./CookieConsent";

const SidebarWrapper = dynamic(
  () => import("./SidebarWrapper").then((mod) => mod.default),
  { ssr: false }
);

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <>
      <Header />

      <SidebarWrapper>
        <main
          className="flex-grow-1 container-fluid px-3 py-4"
          style={{
            marginTop: "70px",
            maxWidth: "1200px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {children}
        </main>

        <CookieConsent />
      </SidebarWrapper>
    </>
  );
}
