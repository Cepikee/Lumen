"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import SidebarToggleFloating from "./SidebarToggleFloating";

interface Props {
  onViewModeChange: (m: "card" | "compact") => void;
  onTodayFilter: () => void;
  onReset: () => void;
  onSourceFilterChange: (sources: string[]) => void;
  onCategoryFilterChange: (cats: string[]) => void;
  activeFilterState: any;
}


export default function SidebarWrapper({
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
      {/* Lebegő toggle gomb */}
      <SidebarToggleFloating
        onOpen={() => setOpen((prev) => !prev)}
        isOpen={open}
      />

      {/* Sidebar panel */}
      <Sidebar
        isOpen={open}
        onClose={() => setOpen(false)}

        // 🔥 Itt volt a hiba → típus hozzáadva
        onViewModeChange={(m: "card" | "compact") => {
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
    </>
  );
}
