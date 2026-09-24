import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export async function GET() {
  console.log(">>> /ai-clean lefutott");

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      user: process.env.DB_USER || "utom_app",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "utom_dev"
    });

    // Frissít minden summary rekordot: beállítja a jelzést
    await connection.execute(
      "UPDATE summaries SET ai_clean = 1 WHERE ai_clean IS NULL OR ai_clean = 0"
    );

    await connection.end();

    return NextResponse.json({
      status: "ok",
      message: "Minden cikk megjelölve: 100% AI–fogalmazás"
    });
  } catch (err: unknown) {
  const message =
    err instanceof Error ? err.message : "Ismeretlen hiba történt";

  console.error("API /ai-clean hiba:", message);

  return NextResponse.json({ error: message }, { status: 500 });
}
}
