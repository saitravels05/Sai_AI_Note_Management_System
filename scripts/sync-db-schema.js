const { execSync } = require("child_process");

async function sync() {
  if (process.env.VERCEL) {
    const dbUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
    const directUrl =
      process.env.DIRECT_URL ||
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL ||
      dbUrl;

    if (!dbUrl) {
      console.warn("[DB SYNC WARNING] No DATABASE_URL found in environment. Skipping automated schema push.");
      return;
    }

    console.log("[DB SYNC] Running on Vercel build. Synchronizing database schema to Neon PostgreSQL...");
    try {
      execSync("npx prisma db push --accept-data-loss --skip-generate", {
        stdio: "inherit",
        env: {
          ...process.env,
          DATABASE_URL: dbUrl,
          DIRECT_URL: directUrl,
        },
      });
      console.log("[DB SYNC] Schema successfully synchronized to remote database!");

      console.log("[DB SYNC] Running automated journal record self-healing...");
      execSync("npx tsx scripts/auto-heal-records.ts", {
        stdio: "inherit",
        env: {
          ...process.env,
          DATABASE_URL: dbUrl,
          DIRECT_URL: directUrl,
        },
      });
      console.log("[DB SYNC] Self-healing complete!");
    } catch (err) {
      console.error("[DB SYNC ERROR] Schema synchronization failed:", err.message);
      process.exit(1);
    }
  } else {
    console.log("[DB SYNC] Non-Vercel environment. Skipping automated schema push.");
  }
}

sync();
