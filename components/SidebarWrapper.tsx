"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import SidebarToggleFloating from "./SidebarToggleFloating";

interface Props {
  children: React.ReactNode;
  onViewModeChange: (mode: string) => void;
  onTodayFilter: () => void;
  onReset: () => void;
  onSourceFilterChange: (sources: string[]) => void;

  // 🔥 ÚJ: kategória szűrés callback
  onCategoryFilterChange: (cats: string[]) => void;

  activeFilterState: any;
}

export default function SidebarWrapper({
  children,
  onViewModeChange,
  onTodayFilter,
  onReset,
  onSourceFilterChange,
  onCategoryFilterChange,   // 🔥 ÚJ
  activeFilterState,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SidebarToggleFloating onOpen={() => setOpen(prev => !prev)} isOpen={open} />

      <Sidebar
        isOpen={open}
        onClose={() => setOpen(false)}
        onViewModeChange={(m) => {
          onViewModeChange(m);
          setOpen(false);
        }}
        onTodayFilter={() => {
          onTodayFilter();
          setOpen(false);
        }}
        onReset={() => {
          onReset();
          setOpen(false);
        }}
        onSourceFilterChange={(s) => {
          onSourceFilterChange(s);
        }}

        // 🔥 ÚJ: továbbadjuk a Sidebar komponensnek
        onCategoryFilterChange={(cats) => {
          onCategoryFilterChange(cats);
        }}

        activeFilterState={activeFilterState}
      />

      <div>{children}</div>
    </>
  );
}
