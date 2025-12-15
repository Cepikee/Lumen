"use client";
import React, { useState, useEffect } from "react";
import SpikeModal from "./SpikeModal";

interface SpikeBadgeProps {
  growth: number | null;
  topic: string;
  totalCount: number;
  period: string;
}

function getIndexFromGrowth(growth: number): number {
  const percent = growth * 100;
  if (percent === 0) return 1;
  if (percent <= 2) return 2;
  if (percent <= 5) return 3;
  if (percent <= 10) return 4;
  if (percent <= 20) return 5;
  if (percent <= 40) return 6;
  if (percent <= 80) return 7;
  if (percent <= 160) return 8;
  if (percent <= 320) return 9;
  return 10;
}

export default function SpikeBadge({ growth, topic, totalCount, period }: SpikeBadgeProps) {
  const [showModal, setShowModal] = useState(false);

  // 🔧 Debug log minden rendernél
  useEffect(() => {
    console.log("DEBUG SpikeBadge", {
      topic,
      totalCount,
      growth,
      period,
    });
  }, [topic, totalCount, growth, period]);

  // Egyszerű szabály: ha csak 1× → besorolás alatt
  const isPending = totalCount <= 1;
  const index = !isPending ? getIndexFromGrowth(growth ?? 0) : null;

  const getClassName = (i: number | null) => {
    if (i == null) return "badge pending";
    if (i <= 3) return "badge green";
    if (i <= 5) return "badge teal";
    if (i <= 7) return "badge blue";
    if (i <= 9) return "badge purple";
    return "badge flame-wind";
  };

  return (
    <>
      <span
        className={getClassName(index)}
        style={{
          borderRadius: "6px",
          fontWeight: 600,
          cursor: "pointer",
          border: "2px solid #000000",
          position: "relative",
          overflow: "hidden",
          color: "#FFFFFF",
        }}
        onClick={() => setShowModal(true)}
      >
        {index === null
          ? "Besorolás alatt"
          : `Spike — Index ${index} ${index === 10 ? "🔥" : ""}`}
      </span>

      <SpikeModal
        topic={topic}
        index={index}
        show={showModal}
        onClose={() => setShowModal(false)}
        initialStats={{ growth, totalCount }}
      />
    </>
  );
}
