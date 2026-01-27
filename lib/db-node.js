import mysql from "mysql2/promise";

export const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "jelszo",      // ← a te MySQL jelszavad
  database: "projekt2025", // ← az adatbázisod neve
});
