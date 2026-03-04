import mysql from "mysql2/promise.js";

export const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "jelszo",
  database: "projekt2025",
});
