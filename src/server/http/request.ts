import { z } from "zod";
import { ApiError } from "./errors";

export function appOrigin() {
  const origin = new URL(process.env.APP_URL || "http://localhost:3000");
  if (origin.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)) throw new ApiError(503, "Application URL must use HTTPS.");
  return origin;
}

export function assertSameOrigin(request: Request) {
  const expected = appOrigin();
  const allowed = new Set([expected.origin]);
  if (["localhost", "127.0.0.1"].includes(expected.hostname)) {
    const alias = new URL(expected); alias.hostname = expected.hostname === "localhost" ? "127.0.0.1" : "localhost";
    allowed.add(alias.origin);
  }
  if (!allowed.has(request.headers.get("origin") ?? "") || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new ApiError(403, "This request did not originate from this application.", "INVALID_ORIGIN");
  }
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>, maxBytes = 16_384): Promise<T> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new ApiError(415, "Send JSON content.");
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) throw new ApiError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Request body is required.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new ApiError(413, "Request is too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let input: unknown;
  try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ApiError(400, "Invalid JSON."); }
  const result = schema.safeParse(input);
  if (!result.success) throw new ApiError(400, "Check the input fields and try again.", "INVALID_INPUT");
  return result.data;
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
}

export async function api(run: () => Promise<Response>): Promise<Response> {
  try { return await run(); }
  catch (error) {
    if (error instanceof ApiError) {
      const response = json({ error: error.message, code: error.code }, error.status);
      if (error.retryAfter) response.headers.set("Retry-After", String(error.retryAfter));
      return response;
    }
    // Never serialize Drizzle errors: they may contain SQL parameters and password hashes.
    const name = error instanceof Error ? error.name.replace(/[^A-Za-z0-9_]/g, "").slice(0, 48) : "UnknownError";
    const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" && /^[A-Z0-9_]{2,40}$/.test(error.code) ? error.code : "UNCLASSIFIED";
    console.error(`Server operation failed (${name}, ${code}); sensitive details withheld.`);
    return json({ error: "The service is temporarily unavailable. Please retry.", code: "SERVICE_UNAVAILABLE" }, 503);
  }
}
