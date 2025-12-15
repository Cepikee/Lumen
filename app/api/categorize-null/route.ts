import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export async function GET() {
  console.log(">>> categorize-null route elindult!");

  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025"
    });

    // 🔧 Első lépés: minden kategóriát NULL-ra állítunk
    await connection.execute("UPDATE trends SET category = NULL WHERE category IS NOT NULL");

    // 🔧 Megszámoljuk, mennyi NULL kategóriás sor van
    const [countRows] = await connection.execute<any[]>(
      "SELECT COUNT(*) AS cnt FROM trends WHERE category IS NULL"
    );
    const totalNulls = countRows[0].cnt;
    console.log(">>> NULL kategóriás sorok száma:", totalNulls);

    if (totalNulls === 0) {
      await connection.end();
      return NextResponse.json({
        status: "ok",
        message: "Nincs feldolgozandó NULL kategóriás kulcsszó",
        processed: 0
      });
    }

    // 🔧 Lekérjük a NULL kategóriás sorokat
    const [rows] = await connection.query<any[]>(
      `SELECT id, keyword FROM trends WHERE category IS NULL LIMIT ${totalNulls}`
    );

    console.log(">>> Feldolgozandó kulcsszavak száma:", rows.length);

    const results: { keyword: string; category: string }[] = [];
    const validCategories = ["Politika", "Sport", "Gazdaság", "Tech"];

    for (const row of rows) {
      console.log(">>> Kulcsszó feldolgozás:", row.keyword);

      // Ellenőrizzük, van-e már kategória ehhez a kulcsszóhoz
      const [existing] = await connection.execute<any[]>(
        "SELECT category FROM trends WHERE keyword = ? AND category IS NOT NULL LIMIT 1",
        [row.keyword]
      );

      let category = "";

      if (existing.length > 0) {
        // 🔧 Már van kategória → nem írjuk át
        category = existing[0].category;
        console.log(`>>> Már van kategória: ${row.keyword} → ${category}`);
      } else {
        // 🔧 Nincs kategória → AI hívás
        const prompt = `Adj meg egyetlen kategóriát az alábbi listából:
[Politika, Sport, Gazdaság, Tech].
Csak a kategória nevét írd vissza, nagybetűvel kezdve:

${row.keyword}`;

        try {
          const res = await fetch("http://127.0.0.1:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "llama3:latest",
              prompt,
              stream: false
            })
          });

          const text = await res.text();
          try {
            const data = JSON.parse(text);
            const parsedCategory = (data.response ?? "").trim();

            if (validCategories.includes(parsedCategory)) {
              category = parsedCategory;
            } else {
              category = "";
            }
          } catch (err) {
            console.error(">>> JSON parse hiba kategóriánál:", err);
            category = "";
          }
        } catch (err: any) {
          console.error(">>> Hiba AI kategorizálásnál:", err.message);
          category = "";
        }

        // 🔧 Csak akkor frissítünk, ha tényleg kaptunk érvényes kategóriát
        if (category) {
          await connection.execute(
            "UPDATE trends SET category = ? WHERE keyword = ? AND category IS NULL",
            [category, row.keyword]
          );
        }
      }

      results.push({ keyword: row.keyword, category });
    }

    await connection.end();
    return NextResponse.json({
      status: "ok",
      message: "NULL kategóriás kulcsszavak újrakategorizálva",
      processed: results.length,
      details: results
    });
  } catch (err: any) {
    console.error("API /categorize-null hiba:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
