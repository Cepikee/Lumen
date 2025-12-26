"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import SidebarToggleFloating from "./SidebarToggleFloating";

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SidebarToggleFloating onOpen={() => setOpen(true)} />
      <Sidebar isOpen={open} onClose={() => setOpen(false)} />
      {children}
    </>
  );
}
