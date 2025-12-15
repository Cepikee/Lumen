"use client";
import { useState } from "react";

interface Props {
  onAnalyze: (url: string) => Promise<void> | void;
  loading: boolean;
}

export default function InputBar({ onAnalyze, loading }: Props) {
  const [url, setUrl] = useState("");

  return (
    <div className="input-group mb-3">
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Írd be a cikk URL-jét..."
        className="form-control"
      />
      <button
        onClick={() => onAnalyze(url)}
        disabled={loading || !url}
        className="btn btn-primary"
      >
        {loading ? "Elemzés folyamatban..." : "Elemzés"}
      </button>
    </div>
  );
}
