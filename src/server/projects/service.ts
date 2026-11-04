import "server-only";
import { randomUUID } from "node:crypto";
import { and, count, desc, eq, ilike, lt, sql } from "drizzle-orm";
import type { z } from "zod";
import { getDb } from "@/server/db";
import { architectureVersions, projects, workspaces, usageEvents } from "@/server/db/schema";
import { type Actor, requireWriter } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { architectureSchema, type Architecture } from "@/domain/architecture/schema";
import { scratchTemplate, templates } from "@/domain/architecture/templates";
import { architectureDiff } from "@/domain/ai/architecture";
import { createProjectSchema, updateProjectSchema, listProjectsSchema, projectIdSchema, type ProjectDocument, type ProjectSummary } from "@/domain/projects/schema";

type Db = ReturnType<typeof getDb>;
type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Row = typeof projects.$inferSelect;
const tenant = (actor: Actor, id: string) => and(eq(projects.id, id), eq(projects.workspaceId, actor.workspaceId));
export function validProjectId(id: string) {
  if (!projectIdSchema.safeParse(id).success) throw new ApiError(404, "Project not found.");
  return id;
}
function summary(row: Pick<Row, "id" | "name" | "description" | "revision" | "status" | "templateId" | "updatedAt">): ProjectSummary {
  return { ...row, updatedAt: row.updatedAt.toISOString() };
}
export function document(row: Row): ProjectDocument {
  return { ...summary({ id: row.id, name: row.name, description: row.description, revision: row.revision, status: row.status, templateId: row.templateId, updatedAt: row.updatedAt }), notes: row.notes, graph: architectureSchema.parse(row.graph), createdAt: row.createdAt.toISOString() };
}
async function snapshot(tx: Transaction, row: Row, actor: Actor, change: string) {
  await tx.insert(architectureVersions).values({
    id: randomUUID(), projectId: row.id, workspaceId: actor.workspaceId, createdBy: actor.id,
    revision: row.revision, name: row.name, description: row.description, notes: row.notes,
    graph: row.graph, change, createdAt: row.updatedAt,
  });
}
export async function listProjects(actor: Actor, input: z.infer<typeof listProjectsSchema>) {
  const pattern = `%${input.q.replace(/[\\%_]/g, "\\$&")}%`;
  const where = and(eq(projects.workspaceId, actor.workspaceId), eq(projects.status, input.status), input.q ? ilike(projects.name, pattern) : undefined);
  const rows = await getDb().select({ id: projects.id, name: projects.name, description: projects.description, revision: projects.revision, status: projects.status, templateId: projects.templateId, updatedAt: projects.updatedAt }).from(projects).where(where).orderBy(desc(projects.updatedAt), desc(projects.id)).limit(12).offset((input.page - 1) * 12);
  const [total] = await getDb().select({ value: count() }).from(projects).where(where);
  return { projects: rows.map(summary), total: total.value, page: input.page, pageSize: 12 };
}
export async function getProject(actor: Actor, id: string) {
  validProjectId(id);
  const [row] = await getDb().select().from(projects).where(tenant(actor, id)).limit(1);
  if (!row) throw new ApiError(404, "Project not found.");
  return document(row);
}
async function insertProject(actor: Actor, input: { name: string; description: string; notes: string; templateId: string; graph: Architecture }) {
  requireWriter(actor);
  const id = randomUUID(), now = new Date();
  const graph = architectureSchema.parse({ ...input.graph, id, name: input.name, description: input.description, version: 1, createdAt: now.toISOString() });
  return getDb().transaction(async tx => {
    const quota = await tx.update(workspaces).set({ projectSlots: sql`${workspaces.projectSlots} + 1` }).where(and(eq(workspaces.id, actor.workspaceId), lt(workspaces.projectSlots, 100))).returning({ id: workspaces.id });
    if (!quota.length) throw new ApiError(409, "This preview workspace has reached its 100-project limit, including Trash.", "PROJECT_LIMIT");
    const [row] = await tx.insert(projects).values({ id, workspaceId: actor.workspaceId, createdBy: actor.id, name: input.name, description: input.description, notes: input.notes, graph, revision: 1, status: "active", templateId: input.templateId, createdAt: now, updatedAt: now }).returning();
    await snapshot(tx, row, actor, "created");
    await tx.insert(usageEvents).values({ id: randomUUID(), workspaceId: actor.workspaceId, userId: actor.id, kind: "project_created", createdAt: now });
    return document(row);
  });
}
export async function createProject(actor: Actor, input: z.infer<typeof createProjectSchema>) {
  const template = [scratchTemplate, ...templates].find(value => value.id === input.templateId);
  if (!template) throw new ApiError(400, "Choose a valid starter template.");
  return insertProject(actor, { ...input, notes: "", graph: template });
}
export async function duplicateProject(actor: Actor, id: string) {
  const source = await getProject(actor, id);
  if (source.status === "deleted") throw new ApiError(409, "Restore this project before duplicating it.");
  return insertProject(actor, { name: `${source.name.slice(0,113)} (copy)`, description: source.description, notes: source.notes, templateId: source.templateId, graph: source.graph });
}
export async function updateProject(actor: Actor, id: string, input: z.infer<typeof updateProjectSchema>) {
  requireWriter(actor); validProjectId(id);
  return getDb().transaction(async tx => {
    const [current] = await tx.select().from(projects).where(tenant(actor, id)).limit(1);
    if (!current) throw new ApiError(404, "Project not found.");
    if (current.revision !== input.revision) throw new ApiError(409, "This project changed in another tab. Reload the latest version before saving.", "REVISION_CONFLICT");
    if (current.status !== "active" && (input.graph || input.name || input.notes !== undefined || input.description !== undefined)) throw new ApiError(409, "Restore this project before editing it.", "INACTIVE_PROJECT");
    const name = input.name ?? current.name, description = input.description ?? current.description;
    const graph = architectureSchema.parse({ ...(input.graph ?? current.graph), id, name, description, version: current.revision + 1, createdAt: current.graph.createdAt });
    const [row] = await tx.update(projects).set({ name, description, graph, notes: input.notes ?? current.notes, status: input.status ?? current.status, revision: current.revision + 1, updatedAt: new Date() }).where(and(tenant(actor, id), eq(projects.revision, input.revision))).returning();
    if (!row) throw new ApiError(409, "This project changed in another tab. Reload before saving.", "REVISION_CONFLICT");
    await snapshot(tx, row, actor, input.status ? `status:${input.status}` : "saved");
    return document(row);
  });
}
export async function projectVersions(actor: Actor, id: string) {
  await getProject(actor, id);
  return getDb().select({ revision: architectureVersions.revision, name: architectureVersions.name, change: architectureVersions.change, createdAt: architectureVersions.createdAt }).from(architectureVersions)
    .where(and(eq(architectureVersions.projectId, id), eq(architectureVersions.workspaceId, actor.workspaceId)))
    .orderBy(desc(architectureVersions.revision)).limit(20);
}

export async function compareProjectVersion(actor: Actor, id: string, revision: number) {
  const current = await getProject(actor, id);
  const [snapshotRow] = await getDb().select().from(architectureVersions).where(and(eq(architectureVersions.projectId, id), eq(architectureVersions.workspaceId, actor.workspaceId), eq(architectureVersions.revision, revision))).limit(1);
  if (!snapshotRow) throw new ApiError(404, "Architecture version not found.");
  return { fromRevision: revision, toRevision: current.revision, graph: architectureDiff(architectureSchema.parse(snapshotRow.graph), current.graph), fields: { nameChanged: snapshotRow.name !== current.name, descriptionChanged: snapshotRow.description !== current.description, notesChanged: snapshotRow.notes !== current.notes } };
}

export async function restoreProjectVersion(actor: Actor, id: string, targetRevision: number, expectedRevision: number) {
  requireWriter(actor); validProjectId(id);
  return getDb().transaction(async tx => {
    const [current] = await tx.select().from(projects).where(tenant(actor, id)).limit(1).for("update");
    if (!current) throw new ApiError(404, "Project not found.");
    if (current.revision !== expectedRevision) throw new ApiError(409, "This project changed in another tab. Reload before restoring a version.", "REVISION_CONFLICT");
    if (current.status !== "active") throw new ApiError(409, "Restore the project from its current status before restoring an architecture version.", "INACTIVE_PROJECT");
    const [source] = await tx.select().from(architectureVersions).where(and(eq(architectureVersions.projectId, id), eq(architectureVersions.workspaceId, actor.workspaceId), eq(architectureVersions.revision, targetRevision))).limit(1);
    if (!source) throw new ApiError(404, "Architecture version not found.");
    const graph = architectureSchema.parse({ ...source.graph, id, name: source.name, description: source.description, version: current.revision + 1, createdAt: current.graph.createdAt });
    const [row] = await tx.update(projects).set({ name: source.name, description: source.description, notes: source.notes, graph, revision: current.revision + 1, updatedAt: new Date() }).where(and(tenant(actor, id), eq(projects.revision, expectedRevision))).returning();
    if (!row) throw new ApiError(409, "This project changed in another tab. Reload before restoring a version.", "REVISION_CONFLICT");
    await snapshot(tx, row, actor, `restored from version ${targetRevision}`);
    return document(row);
  });
}
