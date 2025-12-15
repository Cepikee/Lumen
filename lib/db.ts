import mysql from "mysql2/promise";

export const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "jelszo",       // állítsd be a saját MySQL jelszavad
  database: "projekt2025",  // az adatbázis neve, amit létrehoztál
});
