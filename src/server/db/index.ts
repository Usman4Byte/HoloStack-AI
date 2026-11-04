import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { getDatabase } from "./pool";

/** Initialized only on use; builds and guest workspace pages do not require a database connection. */
export function getDb() { return drizzle(getDatabase()); }
