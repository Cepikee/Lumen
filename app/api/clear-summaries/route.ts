import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export const dynamic = "force-dynamic"; // 👈 fontos, hogy ne cache-elje

export async function POST() {
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo", // <-- saját MySQL jelszavad
      database: "projekt2025"
    });

    // FK kikapcsolás, hogy biztosan törölhető legyen
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    // summaries tábla teljes ürítése
    await connection.query("TRUNCATE TABLE summaries");

    // FK visszakapcsolás
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");

    await connection.end();

    console.log(">>> Összes összefoglalás törölve!");
    return NextResponse.json({ status: "ok", message: "Minden összefoglalás törölve" });
  } catch (err: any) {
    console.error("API /clear-summaries hiba:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
