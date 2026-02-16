require('ts-node/register');
const { cleanCategories } = require('./cleanCategories');

(async () => {
  try {
    console.log(">>> PM2 CLEANER START <<<");
    await cleanCategories();
    console.log(">>> PM2 CLEANER DONE <<<");
    process.exit(0);
  } catch (err) {
    console.error("CLEANER ERROR:", err);
    process.exit(1);
  }
})();
