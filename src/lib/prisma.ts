import { PrismaClient } from "@prisma/client";

// ========== VALIDATE DATABASE_URL ==========
// CRITICAL: Ensure DATABASE_URL is set before initializing Prisma
if (!process.env.DATABASE_URL) {
  throw new Error(
    "❌ DATABASE_URL environment variable is not set. " +
    "Please configure your database connection in environment variables."
  );
}

// Prevent localhost connections in production
if (process.env.NODE_ENV === "production") {
  const dbUrl = process.env.DATABASE_URL;
  
  if (dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")) {
    throw new Error(
      "❌ CRITICAL: Production environment is configured with a localhost database URL. " +
      "This will fail on Vercel. Please set DATABASE_URL to your production database. " +
      `Current DATABASE_URL: ${dbUrl.split("@")[0]}@[REDACTED]`
    );
  }

  // Validate production connection string has required parameters
  if (!dbUrl.includes("?")) {
    console.warn(
      "⚠️  WARNING: Production DATABASE_URL should include connection pooling parameters. " +
      "Recommended: ?pgbouncer=true&connection_limit=1"
    );
  }
}

console.log(`🔌 Database configuration loaded for ${process.env.NODE_ENV || 'development'} environment`);
if (process.env.DATABASE_URL) {
  const hostInfo = process.env.DATABASE_URL.split("@")[1]?.split("/")[0] || "unknown";
  console.log(`📊 Connecting to: ${hostInfo}`);
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Enhanced Prisma Client with logging and error handling
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    errorFormat: "pretty",
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Connection health check with retry logic
let connectionAttempts = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

async function ensureConnection(retryCount = 0): Promise<boolean> {
  try {
    await prisma.$connect();
    if (retryCount > 0) {
      console.log("✅ Database connection restored");
    }
    connectionAttempts = 0;
    return true;
  } catch (error: any) {
    connectionAttempts++;
    
    // Enhanced error logging
    const errorMessage = error?.message || String(error);
    console.error(
      `❌ Database connection failed (attempt ${connectionAttempts}/${MAX_RETRIES}):`,
      errorMessage
    );

    // Check for common issues
    if (errorMessage.includes("localhost") || errorMessage.includes("127.0.0.1")) {
      console.error(
        "💥 LOCALHOST DETECTED: The application is trying to connect to localhost. " +
        "If you're in production, this is a configuration error. " +
        "Please set DATABASE_URL to your production database URL in Vercel environment variables."
      );
    }

    if (retryCount < MAX_RETRIES) {
      console.log(`🔄 Retrying connection in ${RETRY_DELAY / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return ensureConnection(retryCount + 1);
    }

    console.error(
      "💥 Max connection retries reached. Database is unavailable."
    );
    console.error(
      "🔍 Troubleshooting tips:\n" +
      "  1. Verify DATABASE_URL is set correctly\n" +
      "  2. Check database server is running and accessible\n" +
      "  3. Ensure firewall allows connections from this IP\n" +
      "  4. For Vercel: Check environment variables in dashboard"
    );
    return false;
  }
}

// Initial connection check (non-blocking in development only)
if (process.env.NODE_ENV === "development") {
  ensureConnection().then((connected) => {
    if (connected) {
      console.log("✅ Database connected successfully");
    }
  });
}

// Graceful shutdown
async function disconnectPrisma() {
  await prisma.$disconnect();
  console.log("Database connection closed");
}

if (typeof process !== "undefined") {
  process.on("beforeExit", disconnectPrisma);
  process.on("SIGINT", async () => {
    await disconnectPrisma();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await disconnectPrisma();
    process.exit(0);
  });
}

// Export helper for connection testing
export { ensureConnection };
