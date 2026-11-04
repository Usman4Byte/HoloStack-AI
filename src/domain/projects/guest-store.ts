"use client";

import { z } from "zod";
import { architectureSchema } from "@/domain/architecture/schema";
import { scratchTemplate, templates } from "@/domain/architecture/templates";
import { projectDocumentSchema, projectIdSchema, projectNameSchema, type ProjectDocument } from "@/domain/projects/schema";
import { workloadSchema } from "@/domain/intelligence/schema";
import { savedGenerationSchema, savedProposalSchema } from "@/domain/ai/schema";

const key = "holostack.guest-workspace.v1";
const versionSchema = z.object({ revision: z.number().int().positive(), project: projectDocumentSchema, change: z.string().max(100), createdAt: z.iso.datetime() }).strict();
const scenarioSchema = z.object({ id: z.uuid(), projectId: projectIdSchema, graphRevision: z.number().int().positive(), name: z.string().trim().min(1).max(80), workload: workloadSchema, createdAt: z.iso.datetime() }).strict();
const artifactSchema = z.discriminatedUnion("kind", [z.object({ id: z.uuid(), projectId: projectIdSchema, kind: z.literal("generation"), payload: savedGenerationSchema, createdAt: z.iso.datetime() }).strict(), z.object({ id: z.uuid(), projectId: projectIdSchema, kind: z.literal("proposal"), payload: savedProposalSchema, createdAt: z.iso.datetime() }).strict()]);
const messageSchema = z.object({ projectId: projectIdSchema, role: z.enum(["user", "assistant"]), content: z.string().max(4000), createdAt: z.iso.datetime() }).strict();
const envelopeSchema = z.object({ version: z.literal(1), projects: z.array(projectDocumentSchema).max(50), history: z.record(z.string(), z.array(versionSchema).max(20)), scenarios: z.array(scenarioSchema).max(200), artifacts: z.array(artifactSchema).max(100), messages: z.array(messageSchema).max(200) }).strict();
type Envelope = z.infer<typeof envelopeSchema>;
const empty: Envelope = { version: 1, projects: [], history: {}, scenarios: [], artifacts: [], messages: [] };
const listeners = new Set<() => void>();

export class GuestStorageError extends Error {
  constructor(message: string) { super(message); this.name = "GuestStorageError"; }
}

function browserStorage() {
  try { return window.sessionStorage; }
  catch { throw new GuestStorageError("Browser session storage is unavailable. Enable site storage to keep guest work through a refresh."); }
}

export function getGuestSnapshot() {
  try { return browserStorage().getItem(key); }
  catch { return "!unavailable"; }
}
export function getGuestServerSnapshot() { return "__server__"; }
export function subscribeGuest(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => { if (event.key === key) listener(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}
function publish() { for (const listener of listeners) listener(); }

function read(): Envelope {
  const raw = browserStorage().getItem(key);
  if (!raw) return empty;
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch { throw new GuestStorageError("Guest workspace data could not be read. It has been left untouched so it can be recovered."); }
  const parsed = envelopeSchema.safeParse(value);
  if (!parsed.success) throw new GuestStorageError("Guest workspace data failed validation and was left untouched.");
  return parsed.data;
}
function write(value: Envelope) {
  const parsed = envelopeSchema.safeParse(value);
  if (!parsed.success) throw new GuestStorageError("This change exceeds the guest workspace limits and was not saved.");
  try { browserStorage().setItem(key, JSON.stringify(parsed.data)); publish(); }
  catch (error) {
    if (error instanceof GuestStorageError) throw error;
    throw new GuestStorageError("Browser storage is full or unavailable. Export this architecture as JSON before continuing.");
  }
}

export function readGuestWorkspace() { return read(); }
export function findGuestProject(id: string) { return read().projects.find(project => project.id === id) ?? null; }

function graphForProject(projectId: string, name: string, templateId: string) {
  const source = templateId === "scratch" ? scratchTemplate : templates.find(item => item.id === templateId);
  if (!source) throw new GuestStorageError("Choose one of the available architecture templates.");
  const now = new Date().toISOString();
  return architectureSchema.parse({ ...source, id: projectId.replaceAll("-", ""), name, createdAt: now, nodes: source.nodes.map(node => ({ ...node, position: { ...node.position } })), edges: source.edges.map(edge => ({ ...edge, metadata: { ...edge.metadata } })) });
}

export function createGuestProject(input: { name: string; description: string; templateId: string }) {
  const data = read();
  if (data.projects.length >= 50) throw new GuestStorageError("A guest session can hold up to 50 projects. Create an account to keep more work.");
  const now = new Date().toISOString(), id = crypto.randomUUID();
  const project = projectDocumentSchema.parse({ id, name: projectNameSchema.parse(input.name), description: input.description.slice(0, 4000), revision: 1, status: "active", templateId: input.templateId, updatedAt: now, notes: "", graph: graphForProject(id, input.name.trim(), input.templateId), createdAt: now });
  write({ ...data, projects: [project, ...data.projects], history: { ...data.history, [id]: [{ revision: 1, project, change: "Created project", createdAt: now }] } });
  return project;
}

export function updateGuestProject(id: string, expectedRevision: number, changes: Partial<Pick<ProjectDocument, "name" | "description" | "notes" | "graph" | "status">>, change = "Updated project") {
  const data = read(), index = data.projects.findIndex(item => item.id === id);
  if (index < 0) throw new GuestStorageError("This guest project is not available in this browser session.");
  const previous = data.projects[index];
  if (previous.revision !== expectedRevision) throw new GuestStorageError("This project changed in another view. Reload it before saving more changes.");
  const now = new Date().toISOString();
  const revision = previous.revision + 1;
  const name = changes.name ?? previous.name, description = changes.description ?? previous.description;
  const graph = architectureSchema.parse({ ...(changes.graph ?? previous.graph), id: previous.graph.id, name, description, version: revision, createdAt: previous.graph.createdAt });
  const project = projectDocumentSchema.parse({ ...previous, ...changes, name, description, graph, revision, updatedAt: now });
  const versions = [...(data.history[id] ?? []), { revision: project.revision, project, change: change.slice(0, 100), createdAt: now }].slice(-20);
  data.projects[index] = project;
  write({ ...data, history: { ...data.history, [id]: versions } });
  return project;
}

export function duplicateGuestProject(id: string) {
  const source = findGuestProject(id);
  if (!source) throw new GuestStorageError("Project not found in this browser session.");
  const copy = createGuestProject({ name: `${source.name} copy`.slice(0, 120), description: source.description, templateId: "scratch" });
  return updateGuestProject(copy.id, copy.revision, { graph: architectureSchema.parse({ ...source.graph, id: copy.graph.id, name: copy.name, createdAt: copy.createdAt }) , notes: source.notes }, "Duplicated project");
}

export function listGuestVersions(id: string) { return read().history[id] ?? []; }
export function listGuestScenarios(projectId: string) { return read().scenarios.filter(item => item.projectId === projectId).slice().reverse(); }
export function saveGuestScenario(input: { projectId: string; graphRevision: number; name: string; workload: z.infer<typeof workloadSchema> }) {
  const data = read();
  if (!data.projects.some(project => project.id === input.projectId)) throw new GuestStorageError("This project is not available in the guest session.");
  const scenario = scenarioSchema.parse({ ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  write({ ...data, scenarios: [...data.scenarios.filter(item => item.projectId !== input.projectId || item.name !== scenario.name), scenario].slice(-200) });
  return scenario;
}
export function listGuestAIArtifacts(projectId: string) { return read().artifacts.filter(item => item.projectId === projectId).slice().reverse(); }
export function saveGuestAIArtifact(input: Omit<z.infer<typeof artifactSchema>, "id" | "createdAt">) {
  const data = read();
  if (!data.projects.some(project => project.id === input.projectId)) throw new GuestStorageError("This project is not available in the guest session.");
  const artifact = artifactSchema.parse({ ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  write({ ...data, artifacts: [...data.artifacts.filter(item => item.projectId !== input.projectId || item.kind !== input.kind), artifact].slice(-100) });
  return artifact;
}
export function listGuestAIMessages(projectId: string) { return read().messages.filter(item => item.projectId === projectId).slice(-8).map(({ role, content }) => ({ role, content })); }
export function saveGuestAIMessages(projectId: string, messages: { role: "user" | "assistant"; content: string }[]) {
  const data = read();
  if (!data.projects.some(project => project.id === projectId)) throw new GuestStorageError("This project is not available in the guest session.");
  const now = new Date().toISOString();
  const retained = data.messages.filter(item => item.projectId !== projectId);
  const parsed = messages.slice(-8).map(message => messageSchema.parse({ ...message, projectId, createdAt: now }));
  write({ ...data, messages: [...retained, ...parsed].slice(-200) });
}
export function restoreGuestVersion(id: string, revision: number, expectedRevision: number) {
  const version = listGuestVersions(id).find(item => item.revision === revision);
  if (!version) throw new GuestStorageError("That version is no longer available in this browser session.");
  return updateGuestProject(id, expectedRevision, { name: version.project.name, description: version.project.description, notes: version.project.notes, graph: version.project.graph }, `Restored version ${revision}`);
}

export function guestStorageKey() { return key; }
