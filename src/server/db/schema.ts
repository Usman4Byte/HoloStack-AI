import { pgSchema, uuid, text, timestamp, integer, jsonb, primaryKey, uniqueIndex, index } from "drizzle-orm/pg-core";
import type { Architecture } from "@/domain/architecture/schema";

const app = pgSchema("holostack");
const time = (name: string) => timestamp(name, { withTimezone: true }).notNull();
export const users = app.table("users", {
  id: uuid("id").primaryKey(), email: text("email").notNull().unique(),
  name: text("name").notNull(), passwordHash: text("password_hash").notNull(), createdAt: time("created_at"),
});
export const sessions = app.table("sessions", {
  tokenHash: text("token_hash").primaryKey(), userId: uuid("user_id").notNull().references(() => users.id),
  expiresAt: time("expires_at"), createdAt: time("created_at"),
}, t => [index("sessions_user_idx").on(t.userId), index("sessions_expiry_idx").on(t.expiresAt)]);
export const workspaces = app.table("workspaces", {
  id: uuid("id").primaryKey(), ownerId: uuid("owner_id").notNull().unique().references(() => users.id),
  name: text("name").notNull(), projectSlots: integer("project_slots").notNull(), createdAt: time("created_at"),
});
export const workspaceMembers = app.table("workspace_members", {
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  userId: uuid("user_id").notNull().references(() => users.id), role: text("role").notNull(),
}, t => [primaryKey({ columns: [t.workspaceId, t.userId] }), index("members_user_idx").on(t.userId)]);
export const projects = app.table("projects", {
  id: uuid("id").primaryKey(), workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  name: text("name").notNull(), description: text("description").notNull(), notes: text("notes").notNull(),
  graph: jsonb("graph").$type<Architecture>().notNull(), revision: integer("revision").notNull(),
  status: text("status").notNull(), templateId: text("template_id").notNull(),
  createdAt: time("created_at"), updatedAt: time("updated_at"),
}, t => [index("projects_workspace_status_idx").on(t.workspaceId, t.status, t.updatedAt)]);
export const architectureVersions = app.table("architecture_versions", {
  id: uuid("id").primaryKey(), projectId: uuid("project_id").notNull().references(() => projects.id),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  revision: integer("revision").notNull(), name: text("name").notNull(), description: text("description").notNull(),
  notes: text("notes").notNull(), graph: jsonb("graph").$type<Architecture>().notNull(),
  change: text("change").notNull(), createdAt: time("created_at"),
}, t => [uniqueIndex("versions_project_revision_idx").on(t.projectId, t.revision)]);
export const rateLimits = app.table("rate_limits", {
  key: text("key").primaryKey(), attempts: integer("attempts").notNull(), expiresAt: time("expires_at"),
}, t => [index("rate_expiry_idx").on(t.expiresAt)]);
export const usageEvents = app.table("usage_events", {
  id: uuid("id").primaryKey(), workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  userId: uuid("user_id").notNull().references(() => users.id), kind: text("kind").notNull(), createdAt: time("created_at"),
}, t => [index("usage_workspace_idx").on(t.workspaceId, t.createdAt)]);

export const aiQuotaCounters = app.table("ai_quota_counters", {
  key: text("quota_key").primaryKey(), day: text("day_key").notNull(), used: integer("used").notNull(), createdAt: time("created_at"),
}, t => [index("ai_quota_day_idx").on(t.day)]);
export const aiUsageRecords = app.table("ai_usage_records", {
  id: uuid("id").primaryKey(), workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  userId: uuid("user_id").notNull().references(() => users.id), projectId: uuid("project_id").references(() => projects.id),
  feature: text("feature").notNull(), model: text("model").notNull(), status: text("status").notNull(),
  errorCode: text("error_code"), inputTokens: integer("input_tokens"), outputTokens: integer("output_tokens"),
  createdAt: time("created_at"), completedAt: timestamp("completed_at", { withTimezone: true }),
}, t => [index("ai_usage_user_time_idx").on(t.userId, t.createdAt), index("ai_usage_workspace_time_idx").on(t.workspaceId, t.createdAt)]);
export const aiArtifacts = app.table("ai_artifacts", {
  id: uuid("id").primaryKey(), usageId: uuid("usage_id").notNull().references(() => aiUsageRecords.id),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id), userId: uuid("user_id").notNull().references(() => users.id),
  projectId: uuid("project_id").notNull().references(() => projects.id), kind: text("kind").notNull(), payload: jsonb("payload").notNull(),
  createdAt: time("created_at"),
}, t => [index("ai_artifacts_project_time_idx").on(t.projectId, t.createdAt)]);
export const aiMessages = app.table("ai_messages", {
  id: uuid("id").primaryKey(), workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  userId: uuid("user_id").notNull().references(() => users.id), projectId: uuid("project_id").notNull().references(() => projects.id),
  usageId: uuid("usage_id").notNull().references(() => aiUsageRecords.id), role: text("role").notNull(), content: text("content").notNull(),
  createdAt: time("created_at"),
}, t => [index("ai_messages_project_time_idx").on(t.projectId, t.createdAt)]);
export const intelligenceRuns = app.table("intelligence_runs", {
  id: uuid("id").primaryKey(), workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  userId: uuid("user_id").notNull().references(() => users.id), projectId: uuid("project_id").notNull().references(() => projects.id),
  graphRevision: integer("graph_revision").notNull(), name: text("name").notNull(), workload: jsonb("workload").notNull(),
  capacity: jsonb("capacity").notNull(), findings: jsonb("findings").notNull(), createdAt: time("created_at"),
}, t => [index("intelligence_project_time_idx").on(t.projectId, t.createdAt), index("intelligence_workspace_time_idx").on(t.workspaceId, t.createdAt)]);
