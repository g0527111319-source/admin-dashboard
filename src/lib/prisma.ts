import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Return a proxy that throws on actual DB access but doesn't crash at import/build
    console.warn("⚠️ DATABASE_URL is not set — DB calls will fail at runtime");
    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        if (prop === "then" || prop === "$connect" || prop === "$disconnect") {
          return undefined;
        }
        // Return a chainable proxy for model access (e.g., prisma.supplier.count())
        return new Proxy(() => {}, {
          get() {
            return () => {
              throw new Error("DATABASE_URL is not set");
            };
          },
          apply() {
            throw new Error("DATABASE_URL is not set");
          },
        });
      },
    });
  }
  const pool = new pg.Pool({
    connectionString,
    connectionTimeoutMillis: 5000,  // 5s to establish connection
    idleTimeoutMillis: 10000,       // close idle connections after 10s
    max: 5,                         // limit pool size for serverless
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
