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
