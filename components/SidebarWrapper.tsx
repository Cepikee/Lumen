"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import SidebarToggleFloating from "./SidebarToggleFloating";

interface Props {
  children: React.ReactNode;
  onViewModeChange: (m: "card" | "compact") => void;
  onTodayFilter: () => void;
  onReset: () => void;
  onSourceFilterChange: (sources: string[]) => void;
  onCategoryFilterChange: (cats: string[]) => void;
  activeFilterState: any;
}

export default function SidebarWrapper({
  children,
  onViewModeChange,
  onTodayFilter,
  onReset,
  onSourceFilterChange,
  onCategoryFilterChange,
  activeFilterState,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Oldalsó lebegő toggle gomb */}
      <SidebarToggleFloating
        onOpen={() => setOpen((prev) => !prev)}
        isOpen={open}
      />

      {/* Sidebar panel */}
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
        onSourceFilterChange={(sources) => {
          onSourceFilterChange(sources);
        }}
        onCategoryFilterChange={(cats) => {
          onCategoryFilterChange(cats);
        }}
        activeFilterState={activeFilterState}
      />

      {/* Tartalom */}
      <div>{children}</div>
    </>
  );
}
