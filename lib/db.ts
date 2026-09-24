import mysql from "mysql2/promise";

export const db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "utom_app",
  password: process.env.DB_PASSWORD,       // állítsd be a saját MySQL jelszavad
  database: process.env.DB_NAME || "utom_dev",  // az adatbázis neve, amit létrehoztál
});
