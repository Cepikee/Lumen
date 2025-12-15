"use client";

export default function HeaderActions() {
  async function handleClear() {
    if (!confirm("Biztosan törölni akarod az összes összefoglalást?")) return;
    try {
      const res = await fetch("/api/clear-summaries", { method: "POST" });
      const data = await res.json();
      alert(data.message || "Összes törölve.");
      window.dispatchEvent(new CustomEvent("lumen:update"));
    } catch (err) {
      alert("Hiba történt a törlés közben!");
      console.error(err);
    }
  }

  async function handleGenerateNews() {
    try {
      const res = await fetch("/api/summarize-all");
      const data = await res.json();
      alert("Új hír generálva és mentve!");
      window.dispatchEvent(new CustomEvent("lumen:update"));
    } catch (err) {
      alert("Hiba történt a hír generálás közben!");
      console.error(err);
    }
  }

  return (
    <div>
      <button onClick={handleClear} className="btn btn-danger me-2">
        🗑️ Összes törlése
      </button>
      <button onClick={handleGenerateNews} className="btn btn-success">
        ⚡ Új hír generálása
      </button>
    </div>
  );
}
