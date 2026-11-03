import "server-only";
import { Pool } from "pg";
import { databaseConfig } from "./config";

const globalDatabase = globalThis as unknown as { holostackPool?: Pool };

/** A bounded connection pool is a cache, never durable application state. */
export function getDatabase(): Pool {
  if (!globalDatabase.holostackPool) {
    const pool = new Pool(databaseConfig());
    pool.on("error", () => console.error("Idle database connection failed."));
    globalDatabase.holostackPool = pool;
  }
  return globalDatabase.holostackPool;
}
