// app/api/trend-history/route.ts
import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword");
  const period = searchParams.get("period");   // 🔹 új paraméter
  const sources = searchParams.get("sources"); // 🔹 új paraméter
  const startDate = searchParams.get("startDate"); // 🔹 új paraméter
  const endDate = searchParams.get("endDate");     // 🔹 új paraméter

  if (!keyword) {
    return NextResponse.json({ error: "keyword paraméter hiányzik" }, { status: 400 });
  }

  try {
    // időszak értelmezése
    let intervalValue: number | null = null;
    const intervalUnit = "DAY";

    if (period === "24h") intervalValue = 1;
    else if (period === "7d") intervalValue = 7;
    else if (period === "30d") intervalValue = 30;
    else if (period === "custom") intervalValue = null; // 🔹 custom esetben nem használunk fix intervallumot

    // forráslista előkészítése
    const sourceList = sources ? sources.split(",").filter(s => s.trim() !== "") : [];

    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025"
    });

    // WHERE feltételek összeállítása
    const whereParts: string[] = ["keyword = ?"];
    const params: any[] = [keyword];

    if (period !== "custom" && intervalValue) {
      whereParts.push(`created_at >= NOW() - INTERVAL ${intervalValue} ${intervalUnit}`);
    }

    if (period === "custom" && startDate && endDate) {
      whereParts.push(`DATE(created_at) BETWEEN ? AND ?`);
      params.push(startDate, endDate);
    }

    if (sourceList.length > 0) {
      whereParts.push(`source IN (${sourceList.map(() => "?").join(",")})`);
      params.push(...sourceList);
    }

    const whereClause = `WHERE ${whereParts.join(" AND ")}`;

    const [rows] = await connection.execute<any[]>(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day, COUNT(*) AS freq
       FROM trends
       ${whereClause}
       GROUP BY day
       ORDER BY day ASC`,
      params
    );

    await connection.end();

    return NextResponse.json({
      keyword,
      history: rows
    });
  } catch (err: any) {
    console.error("API /trend-history hiba:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}