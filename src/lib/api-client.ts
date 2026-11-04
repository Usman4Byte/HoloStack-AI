export class RequestError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}
export async function requestJson<T>(url: string, method = "GET", body?: unknown, timeoutMs = 30_000): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { method, credentials: "same-origin", cache: "no-store", headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new RequestError("This AI request is taking longer while the configured models are tried. Check your allowance before retrying; the server may still be finishing this request.", 408, "CLIENT_TIMEOUT");
    }
    throw new RequestError("Could not reach the server. Check your connection and retry.", 0);
  }
  let data;
  try { data = await response.json(); } catch { throw new RequestError("Unexpected response. Please retry.", response.status); }
  if (!response.ok) throw new RequestError(data.error || "Request failed. Please retry.", response.status, data.code);
  return data as T;
}
