// /api/forecast-status.js

const mysql = require("mysql2/promise");

function calculateNextRun(finishedAt) {
  const nextHour = new Date(finishedAt);
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);

  const forecastEnd = new Date(nextHour);
  forecastEnd.setHours(forecastEnd.getHours() + 6);

  const nextRun = new Date(forecastEnd);
  nextRun.setMinutes(nextRun.getMinutes() - 15);

  return nextRun;
}

module.exports = async (req, res) => {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  const [rows] = await conn.execute(
    "SELECT finished_at FROM forecast_runs ORDER BY id DESC LIMIT 1"
  );

  await conn.end();

  if (!rows.length) {
    return res.json({
      status: "unknown",
      lastRun: null,
      nextRun: null,
    });
  }

  const lastRun = new Date(rows[0].finished_at);
  const nextRun = calculateNextRun(lastRun);

  const now = new Date();

  let status = "waiting";

  if (now < nextRun) status = "waiting";
  if (now > nextRun) status = "running";

  res.json({
    status,
    lastRun,
    nextRun,
  });
};
