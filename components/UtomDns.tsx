"use client";

import React, { useState, useEffect } from "react";
import UtomDnsKategoria from "@/components/UtomDnsKategoria";

export default function UtomDns() {
  const [domain, setDomain] = useState("");

  useEffect(() => {
    const load = () => {
      const d = localStorage.getItem("selectedDomain") || "";
      setDomain(d);
    };

    load();

    window.addEventListener("domain-change", load);
    return () => window.removeEventListener("domain-change", load);
  }, []);

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
      <UtomDnsKategoria domain={domain} />
    </div>
  );
}
