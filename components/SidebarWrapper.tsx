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
  activeFilterState: any;
}

export default function SidebarWrapper({
  children,
  onViewModeChange,
  onTodayFilter,
  onReset,
  onSourceFilterChange,
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
        activeFilterState={activeFilterState}
      />

      <div>{children}</div>
    </>
  );
}
