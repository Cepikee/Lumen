"use client";

import { useState, useEffect } from "react";

export default function UtomDns() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Itt később betöltjük a DNS profilt az API-ból
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-full flex flex-col gap-6">
      <h1 className="text-3xl font-bold">uTOM DNS Modul</h1>

      {loading ? (
        <div className="text-gray-500">Betöltés...</div>
      ) : (
        <div className="p-4 border rounded-lg bg-white shadow">
          <p className="text-lg">
            Itt fog megjelenni a 3D DNS spirál és a portálok genom‑profilja.
          </p>
        </div>
      )}
    </div>
  );
}
