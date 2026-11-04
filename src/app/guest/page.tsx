import { GuestDashboard } from "@/components/guest-dashboard";
import { GuestWorkspaceShell } from "@/components/guest-workspace-shell";
import { listProjectsSchema } from "@/domain/projects/schema";
import { scratchTemplate, templates } from "@/domain/architecture/templates";

export default async function GuestPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const parsed = listProjectsSchema.safeParse(raw);
  const filters = parsed.success ? parsed.data : listProjectsSchema.parse({});
  const requestedTemplate = typeof raw.template === "string" ? raw.template : "";
  const defaultTemplateId = [scratchTemplate, ...templates].some(template => template.id === requestedTemplate) ? requestedTemplate : undefined;
  return <GuestWorkspaceShell><GuestDashboard status={filters.status} query={filters.q} defaultTemplateId={defaultTemplateId} /></GuestWorkspaceShell>;
}
