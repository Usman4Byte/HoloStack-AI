import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { architectureSchema } from "@/domain/architecture/schema";
import { simulateCapacity, reviewArchitecture, type CapacityResult, type ReviewFinding } from "@/domain/intelligence/engine";
import { workloadSchema, scenarioSaveSchema } from "@/domain/intelligence/schema";
import { getDb } from "@/server/db";
import { ApiError } from "@/server/http/errors";
import { intelligenceRuns, projects } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { requireWriter } from "@/server/auth/session";
import { getProject, validProjectId } from "@/server/projects/service";

export async function listIntelligenceRuns(actor: Actor, projectId: string) {
  await getProject(actor, projectId);
  return getDb().select({ id: intelligenceRuns.id, graphRevision: intelligenceRuns.graphRevision, name: intelligenceRuns.name, workload: intelligenceRuns.workload, capacity: intelligenceRuns.capacity, findings: intelligenceRuns.findings, createdAt: intelligenceRuns.createdAt })
    .from(intelligenceRuns).where(and(eq(intelligenceRuns.projectId, projectId), eq(intelligenceRuns.workspaceId, actor.workspaceId), eq(intelligenceRuns.userId, actor.id)))
    .orderBy(desc(intelligenceRuns.createdAt), desc(intelligenceRuns.id)).limit(12);
}

export async function saveIntelligenceRun(actor: Actor, projectId: string, input: unknown) {
  requireWriter(actor);
  validProjectId(projectId);
  const parsed = scenarioSaveSchema.safeParse(input);
  if (!parsed.success) throw new ApiError(400, "Check the scenario fields and try again.", "INVALID_SCENARIO");
  const workload = workloadSchema.parse(parsed.data.workload);
  return getDb().transaction(async tx => {
    const [project] = await tx.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.workspaceId, actor.workspaceId))).limit(1).for("update");
    if (!project) throw new ApiError(404, "Project not found.");
    if (project.status !== "active") throw new ApiError(409, "Restore this project before saving a new scenario.", "INACTIVE_PROJECT");
    if (project.revision !== parsed.data.expectedRevision) throw new ApiError(409, "Save the latest project draft before saving its scenario.", "REVISION_CONFLICT");
    const graph = architectureSchema.parse(project.graph);
    const capacity: CapacityResult = simulateCapacity(graph, workload);
    const findings: ReviewFinding[] = reviewArchitecture(graph, workload);
    const id = randomUUID(), createdAt = new Date();
    await tx.insert(intelligenceRuns).values({
      id, workspaceId: actor.workspaceId, userId: actor.id, projectId, graphRevision: project.revision,
      name: parsed.data.name, workload, capacity, findings, createdAt,
    });
    return { id, graphRevision: project.revision, name: parsed.data.name, workload, capacity, findings, createdAt: createdAt.toISOString() };
  });
}
