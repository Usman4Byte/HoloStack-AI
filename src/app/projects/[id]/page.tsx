import { WorkspaceShell } from "@/components/workspace-shell";
import { ProjectEditor } from "@/components/projects/project-editor";
import { getProject } from "@/server/projects/service";
import { privatePage } from "@/server/http/page";
import { publicActor } from "@/server/auth/session";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, data } = await privatePage(actor => getProject(actor, id));
  return <WorkspaceShell active="project" user={publicActor(actor)}><ProjectEditor key={data.id} initial={data} /></WorkspaceShell>;
}
