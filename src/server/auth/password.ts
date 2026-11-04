import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const options = { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 };
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, options, (error, key) => error ? reject(error) : resolve(key)));
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt-v1$${salt.toString("hex")}$${key.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string | null) {
  const match = /^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(encoded ?? "");
  // A missing account still runs the same KDF. Do not skip work on unknown email.
  const actual = await derive(password, match ? Buffer.from(match[1], "hex") : Buffer.alloc(16));
  const expected = match ? Buffer.from(match[2], "hex") : Buffer.alloc(64);
  return timingSafeEqual(actual, expected) && match !== null;
}
