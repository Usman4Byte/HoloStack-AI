import "server-only";
import { notFound, redirect } from "next/navigation";
import { requireActor, type Actor } from "@/server/auth/session";
import { ApiError } from "./errors";

export async function privatePage<T>(run: (actor: Actor) => Promise<T>) {
  try { const actor = await requireActor(); return { actor, data: await run(actor) }; }
  catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    if (error instanceof ApiError && error.status === 404) notFound();
    // Keep provider/query details out of Next's server error logs and RSC responses.
    throw new Error("The workspace could not be loaded. Please retry shortly.");
  }
}
