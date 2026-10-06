import { PrismaClient } from "@prisma/client";

declare global {
  var globalPrisma: PrismaClient | undefined;
}

const DEFAULT_LOCAL_DB = "postgresql://postgres:postgres@localhost:5432/sai_books_db?schema=public";

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "") {
    return process.env.DATABASE_URL.trim();
  }

  if (process.env.NODE_ENV === "production") {
    console.error(
      "[PRISMA FATAL CONFIG ERROR] DATABASE_URL is not configured in production environment variables. " +
      "Configure a hosted PostgreSQL database (e.g. Neon, Supabase) in Vercel Project Settings."
    );
    throw new Error(
      "Database connection string is not configured for production. Please configure DATABASE_URL in Vercel."
    );
  }

  return DEFAULT_LOCAL_DB;
}

export const prisma =
  globalThis.globalPrisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalThis.globalPrisma = prisma;

export default prisma;
