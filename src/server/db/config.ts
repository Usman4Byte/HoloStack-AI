import type { PoolConfig } from "pg";
import { createHash } from "node:crypto";

export class DatabaseConfigurationError extends Error {
  constructor(message: string) { super(message); this.name = "DatabaseConfigurationError"; }
}

/** Shared by the server-only pool and local CLI. Never import into a client component. */
export function databaseConfig(env: Record<string, string | undefined> = process.env): PoolConfig {
  if (!env.DATABASE_URL?.trim()) {
    throw new DatabaseConfigurationError("DATABASE_URL is missing. Set it privately in .env.local.");
  }
  let url: URL;
  try { url = new URL(env.DATABASE_URL); }
  catch { throw new DatabaseConfigurationError("DATABASE_URL must be a valid PostgreSQL URL."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new DatabaseConfigurationError("Use a PostgreSQL-compatible instance and postgres:// or postgresql:// URL.");
  }
  if (!url.hostname || !url.username || !url.password || url.pathname.length < 2 || url.hash) {
    throw new DatabaseConfigurationError("The URL needs host, username, password, and database. URL-encode credentials.");
  }
  for (const key of url.searchParams.keys()) {
    if (key !== "sslmode") throw new DatabaseConfigurationError("Only sslmode is supported in URL options. Use DATABASE_CA_CERT for a custom CA.");
  }
  const mode = url.searchParams.get("sslmode");
  if (mode && !["require", "verify-ca", "verify-full"].includes(mode)) {
    throw new DatabaseConfigurationError("TLS cannot be disabled. Use sslmode=verify-full.");
  }
  const port = url.port ? Number(url.port) : 5432;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new DatabaseConfigurationError("Invalid database port.");
  try {
    // Do not pass connectionString: pg URL SSL options can overwrite strict TLS settings.
    return {
      host: url.hostname, port, user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password), database: decodeURIComponent(url.pathname.slice(1)),
      ssl: { rejectUnauthorized: true, ...(env.DATABASE_CA_CERT ? { ca: env.DATABASE_CA_CERT.replace(/\\n/g, "\n") } : {}) },
      max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 8_000,
      query_timeout: 10_000, allowExitOnIdle: true, maxLifetimeSeconds: 60,
      application_name: "holostack-ai",
    };
  } catch { throw new DatabaseConfigurationError("Invalid URL encoding in database connection fields."); }
}

export function databaseFingerprint(config: PoolConfig): string {
  return createHash("sha256").update(JSON.stringify([config.host, config.port, config.database, config.user])).digest("hex");
}

export function safeDatabaseError(error: unknown): string {
  if (error instanceof DatabaseConfigurationError) return error.message;
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const hints: Record<string, string> = {
    "28P01": "Authentication failed. Check the credentials locally.",
    "28000": "Authentication or access policy rejected the connection.",
    "3D000": "Database does not exist. Use the database shown in TiDB Connect.",
    "42501": "Insufficient database privileges for this check.",
    "ENOTFOUND": "Database hostname could not be resolved.",
    "ECONNREFUSED": "Connection refused. Check endpoint, port, and network access.",
    "ETIMEDOUT": "Connection timed out. Check network access and endpoint.",
    "CERT_HAS_EXPIRED": "Server certificate expired. Do not disable TLS verification.",
    "UNABLE_TO_VERIFY_LEAF_SIGNATURE": "Certificate chain could not be verified. Configure the provider CA if required.",
    "ERR_TLS_CERT_ALTNAME_INVALID": "TLS hostname validation failed. Check the provider endpoint.",
  };
  return hints[code] ?? `Database operation failed${/^[A-Z0-9_]{2,40}$/.test(code) ? ` (${code})` : ""}. Raw provider errors are withheld to protect connection details.`;
}
