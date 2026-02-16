import { db } from "@/lib/db";

export async function cleanCategories() {
  console.log(">>> CATEGORY CLEANER FUT <<<");

  const fixes = [
    { bad: ["gsz", "]gy", "Egsz"], good: "Egészségügy" },
    { bad: ["Gazdas", "�g"], good: "Gazdaság" },
    { bad: ["zlet", "K�z", "Kzlet"], good: "Közélet" },
    { bad: ["Kult", "Qra"], good: "Kultúra" },
    { bad: ["Oktat", "�s"], good: "Oktatás" },
  ];

  for (const fix of fixes) {
    for (const pattern of fix.bad) {
      await db.query(
        `
        UPDATE summaries
        SET category = ?
        WHERE category LIKE ?
      `,
        [fix.good, `%${pattern}%`]
      );
    }
  }

  console.log(">>> CATEGORY CLEANER KÉSZ <<<");
}
