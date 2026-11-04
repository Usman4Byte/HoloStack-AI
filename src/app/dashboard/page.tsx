import { WorkspaceShell } from "@/components/workspace-shell";
import { Dashboard } from "@/components/projects/dashboard";
import { listProjectsSchema } from "@/domain/projects/schema";
import { listProjects } from "@/server/projects/service";
import { privatePage } from "@/server/http/page";
import { publicActor } from "@/server/auth/session";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = listProjectsSchema.safeParse(params);
  const filters = parsed.success ? parsed.data : listProjectsSchema.parse({});
  const { actor, data } = await privatePage(actor => listProjects(actor, filters));
  return <WorkspaceShell active="dashboard" user={publicActor(actor)}><Dashboard key={`${filters.status}:${filters.q}:${filters.page}`} name={actor.name} listing={data} status={filters.status} query={filters.q} /></WorkspaceShell>;
}
