"use client";

export default function ClearButton() {
  async function handleClear() {
    try {
      const res = await fetch("/api/clear-summaries", {
        method: "POST"
      });
      const data = await res.json();
      alert(data.message); // visszajelzés a felhasználónak
    } catch (err) {
      alert("Hiba történt a törlés közben!");
      console.error(err);
    }
  }

  return (
    <button
      onClick={handleClear}
      className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
    >
      Összes összefoglalás törlése
    </button>
  );
}
