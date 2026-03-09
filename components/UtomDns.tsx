"use client";

import React, { useState } from "react";
import UtomDnsKategoria from "@/components/UtomDnsKategoria";

export default function UtomDns() {
  const [domain, setDomain] = useState("");

  return (
    <div className="w-screen min-h-screen bg-[#071226] text-white p-6 flex flex-col items-center gap-8">

      {/* DOMAIN VÁLASZTÓ FELÜL */}
      <select
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        className="bg-[#0d1a2d] border border-white/20 rounded p-2 text-sm"
      >
        <option value="">-- válassz domaint --</option>
        <option value="444.hu">444.hu</option>
        <option value="origo.hu">origo.hu</option>
        <option value="telex.hu">telex.hu</option>
        <option value="index.hu">index.hu</option>
      </select>

      {/* CHART */}
      <UtomDnsKategoria domain={domain} />

    </div>
  );
}
