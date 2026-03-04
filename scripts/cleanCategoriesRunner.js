// cleanCategoriesRunner.js

(async () => {
  try {
    console.log(">>> PM2 CLEANER START <<<");

    // ESM modul betöltése dinamikusan
    const { cleanCategories } = await import("./cleanCategories.js");

    await cleanCategories();

    console.log(">>> PM2 CLEANER DONE <<<");
    process.exit(0);
  } catch (err) {
    console.error("CLEANER ERROR:", err);
    process.exit(1);
  }
})();
