"use client";
import { useState } from "react";

export default function Tooltip({ content, children }: any) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="tooltip-wrapper"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      style={{ position: "relative", display: "inline-block" }}
    >
      {children}

      {visible && (
        <span className="tooltip-box">
          {content}
        </span>
      )}
    </span>
  );
}
