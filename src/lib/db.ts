import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7 reaches the database through a driver adapter rather than a `url` in
 * the schema, so the connection string is read here.
 *
 * The client is cached on `globalThis` in development because Next replaces the
 * module on every hot reload, and a fresh PrismaClient per reload exhausts the
 * connection pool within a few edits.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and point it at a Postgres database.",
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
