import { z } from "zod";
import { architectureSchema } from "@/domain/architecture/schema";
export const projectIdSchema = z.uuid();
export const projectNameSchema = z.string().trim().min(1).max(120);
export const createProjectSchema = z.object({ name: projectNameSchema, description: z.string().max(4000).default(""), templateId: z.string().min(1).max(80) }).strict();
export const updateProjectSchema = z.object({
  revision: z.number().int().min(1).max(2147483646), name: projectNameSchema.optional(),
  description: z.string().max(4000).optional(), notes: z.string().max(20000).optional(),
  graph: architectureSchema.optional(), status: z.enum(["active", "archived", "deleted"]).optional(),
}).strict().refine(input => Object.keys(input).length > 1, "At least one change is required.");
export const listProjectsSchema = z.object({
  status: z.enum(["active", "archived", "deleted"]).default("active"),
  page: z.coerce.number().int().min(1).max(10000).default(1), q: z.string().trim().max(100).default(""),
});
export type ProjectSummary = { id: string; name: string; description: string; revision: number; status: string; templateId: string; updatedAt: string };
export type ProjectDocument = ProjectSummary & { notes: string; graph: z.infer<typeof architectureSchema>; createdAt: string };
