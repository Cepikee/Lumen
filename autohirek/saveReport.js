const db = require("../lib/db");

async function saveDailyReport(content) {
  const conn = await db();

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  await conn.execute(
    `
    INSERT INTO daily_reports (report_date, content)
    VALUES (?, ?)
    `,
    [dateStr, content]
  );

  return true;
}

module.exports = saveDailyReport;
