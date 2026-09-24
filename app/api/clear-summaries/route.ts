import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export const dynamic = "force-dynamic"; // 👈 fontos, hogy ne cache-elje

export async function POST() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      user: process.env.DB_USER || "utom_app",
      password: process.env.DB_PASSWORD, // <-- saját MySQL jelszavad
      database: process.env.DB_NAME || "utom_dev"
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
 } catch (err: unknown) {
  const message =
  err instanceof Error ? err.message : "Ismeretlen hiba történt";
  console.error("API /clear-summaries hiba:", message);
  return NextResponse.json({ error: message }, { status: 500 });
}
}