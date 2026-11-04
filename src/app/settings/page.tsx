import { and, count, eq } from "drizzle-orm";
import { WorkspaceShell } from "@/components/workspace-shell";
import { AccountSettings } from "@/components/auth/account-settings";
import { privatePage } from "@/server/http/page";
import { publicActor } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { workspaces, usageEvents } from "@/server/db/schema";
import { aiStats } from "@/server/ai/quota";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  const { actor, data } = await privatePage(async actor => {
    const [workspace] = await getDb().select({ projectSlots: workspaces.projectSlots }).from(workspaces).where(eq(workspaces.id, actor.workspaceId));
    const [events] = await getDb().select({ value: count() }).from(usageEvents).where(and(eq(usageEvents.workspaceId, actor.workspaceId), eq(usageEvents.kind, "project_created")));
    const ai = await aiStats(actor);
    return { projectSlots: workspace.projectSlots, projectEvents: events.value, aiCalls: ai.calls };
  });
  return <WorkspaceShell active="settings" user={publicActor(actor)}><AccountSettings user={publicActor(actor)} usage={data} /></WorkspaceShell>;
}
