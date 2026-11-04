import { createProjectSchema, listProjectsSchema } from "@/domain/projects/schema";
import { requireActor } from "@/server/auth/session";
import { rateLimit } from "@/server/auth/rate-limit";
import { createProject, listProjects } from "@/server/projects/service";
import { api, assertSameOrigin, json, readJson } from "@/server/http/request";
import { ApiError } from "@/server/http/errors";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return api(async () => {
    const actor = await requireActor();
    const input = listProjectsSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!input.success) throw new ApiError(400, "Invalid project filters.");
    return json(await listProjects(actor, input.data));
  });
}
export async function POST(request: Request) {
  return api(async () => {
    assertSameOrigin(request); const actor = await requireActor();
    await rateLimit("project-write", actor.id, 60, 60);
    return json({ project: await createProject(actor, await readJson(request, createProjectSchema)) }, 201);
  });
}
