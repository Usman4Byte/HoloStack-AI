import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { getDatabase } from "./pool";

/** Initialized only on use; builds and public sample pages do not require a database. */
export function getDb() { return drizzle(getDatabase()); }
