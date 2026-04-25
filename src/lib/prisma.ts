import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

const connectionString = process.env.DIRECT_DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_DATABASE_URL is not configured.");
}

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

function getClient() {
  if (!globalThis.prisma) {
    globalThis.prisma = createPrismaClient();
  }

  return globalThis.prisma;
}

async function resetClient() {
  if (!globalThis.prisma) {
    return;
  }

  try {
    await globalThis.prisma.$disconnect();
  } catch {
    // Ignore disconnect failures during retry recovery.
  } finally {
    globalThis.prisma = undefined;
  }
}

function isRetryablePrismaError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("driveradaptererror") ||
    message.includes("prepared statement") ||
    message.includes('portal "" does not exist') ||
    message.includes("fetch failed") ||
    message.includes("connection") ||
    message.includes("socket")
  );
}

export const prisma = getClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export async function withPrismaRetry<T>(
  operation: (client: PrismaClient) => Promise<T>,
) {
  try {
    return await operation(getClient());
  } catch (error) {
    if (!isRetryablePrismaError(error)) {
      throw error;
    }

    await resetClient();
    return operation(getClient());
  }
}
