import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var globalPrisma: PrismaClient | undefined;
}

const DEFAULT_LOCAL_DB = "postgresql://postgres:postgres@localhost:5432/sai_books_db?schema=public";
const databaseUrl = process.env.DATABASE_URL || DEFAULT_LOCAL_DB;

export const prisma =
  global.globalPrisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.globalPrisma = prisma;
}

export default prisma;
