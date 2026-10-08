import { PrismaClient } from "@prisma/client";

declare global {
  var globalPrisma: PrismaClient | undefined;
}

const DEFAULT_LOCAL_DB = "postgresql://postgres:postgres@localhost:5432/sai_books_db?schema=public";

function getDatabaseUrl(): string {
  // 1. Prioritize pooled connection for Prisma on Vercel/Neon (prevents "Error in PostgreSQL connection: Error { kind: Closed }")
  if (process.env.POSTGRES_PRISMA_URL && process.env.POSTGRES_PRISMA_URL.trim() !== "") {
    return process.env.POSTGRES_PRISMA_URL.trim();
  }

  // 2. Standard DATABASE_URL
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "") {
    return process.env.DATABASE_URL.trim();
  }

  // 3. Fall back to POSTGRES_URL
  if (process.env.POSTGRES_URL && process.env.POSTGRES_URL.trim() !== "") {
    return process.env.POSTGRES_URL.trim();
  }

  if (process.env.NODE_ENV === "production") {
    console.error(
      "[PRISMA FATAL CONFIG ERROR] Neither POSTGRES_PRISMA_URL nor DATABASE_URL is configured in production environment variables."
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
