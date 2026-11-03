import { describe, expect, it } from "vitest";
import { databaseConfig, databaseFingerprint, safeDatabaseError } from "../../src/server/db/config";

const url = "postgresql://user:p%40ss%3Aword@example.invalid:5432/app?sslmode=require";
describe("database security boundary", () => {
  it("fails closed without configuration or with MySQL protocol", () => {
    expect(() => databaseConfig({})).toThrow("missing");
    expect(() => databaseConfig({ DATABASE_URL: "mysql://u:p@host/db" })).toThrow("PostgreSQL-compatible");
  });
  it("keeps certificate validation enabled even for sslmode=require", () => {
    const config = databaseConfig({ DATABASE_URL: url });
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
    expect(config).not.toHaveProperty("connectionString");
    expect(config.password).toBe("p@ss:word");
    expect(config.max).toBe(3);
  });
  it("rejects weak TLS modes and URL parameters that could override TLS", () => {
    for (const suffix of ["sslmode=disable", "sslmode=prefer", "sslrootcert=untrusted", "sslmode=no-verify", "options=anything"]) {
      expect(() => databaseConfig({ DATABASE_URL: url.split("?")[0] + "?" + suffix })).toThrow();
    }
  });
  it("rejects malformed URLs without echoing credentials", () => {
    try { databaseConfig({ DATABASE_URL: "secret-password" }); } catch (error) { expect(safeDatabaseError(error)).not.toContain("secret-password"); }
    expect(() => databaseConfig({ DATABASE_URL: "postgres://u:p@host/" })).toThrow();
    expect(() => databaseConfig({ DATABASE_URL: "postgres://u:p@host/db#secret" })).toThrow();
  });
  it("sanitizes provider errors and never prints arbitrary messages or codes", () => {
    expect(safeDatabaseError({ code: "28P01", message: url })).toContain("Authentication failed");
    expect(safeDatabaseError({ code: url, message: url })).not.toContain(url);
    expect(safeDatabaseError(new Error(url))).not.toContain("example.invalid");
  });
  it("binds verification to database and role without binding to a password", () => {
    const config = databaseConfig({ DATABASE_URL: url });
    expect(databaseFingerprint(config)).toBe(databaseFingerprint({ ...config, password: "rotated" }));
    expect(databaseFingerprint(config)).not.toBe(databaseFingerprint({ ...config, database: "other" }));
    expect(databaseFingerprint(config)).not.toBe(databaseFingerprint({ ...config, user: "other" }));
  });
});
