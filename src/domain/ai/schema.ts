import { z } from "zod";
import { nodeTypes } from "@/domain/architecture/schema";
import { architectureSchema } from "@/domain/architecture/schema";

const identifier = z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/);
const shortText = z.string().trim().min(1).max(1000);

export const generatedArchitectureSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(4000),
  requirements: z.string().max(4000),
  assumptions: z.array(z.string().max(1000)).max(12),
  tradeoffs: z.array(z.string().max(1000)).max(8),
  nodes: z.array(z.object({
    id: identifier, type: z.enum(nodeTypes), label: z.string().trim().min(1).max(100),
    description: z.string().max(1000), technology: z.string().max(200),
    trustBoundary: z.enum(["public", "private", "external"]),
    notes: z.string().max(1000),
  }).strict()).min(1).max(25),
  edges: z.array(z.object({
    id: identifier, source: identifier, target: identifier,
    kind: z.enum(["https", "query", "event", "stream"]), label: z.string().max(100),
    contract: z.string().max(1000),
  }).strict()).max(60),
}).strict();

export const architectureChangeSchema = z.object({
  operation: z.enum(["add_node", "update_node", "remove_node", "add_edge", "remove_edge"]),
  targetId: z.string().max(80),
  node: z.object({
    id: identifier, type: z.enum(nodeTypes), label: z.string().trim().min(1).max(100),
    description: z.string().max(1000), technology: z.string().max(200),
    trustBoundary: z.enum(["public", "private", "external"]), notes: z.string().max(1000),
  }).strict().nullable(),
  edge: z.object({
    id: identifier, source: identifier, target: identifier,
    kind: z.enum(["https", "query", "event", "stream"]), label: z.string().max(100), contract: z.string().max(1000),
  }).strict().nullable(),
}).strict();

export const assistantResultSchema = z.object({
  answer: z.string().trim().min(1).max(4000),
  changes: z.array(architectureChangeSchema).max(8),
  tradeoffs: z.array(shortText).max(8),
}).strict();

export const savedGenerationSchema = z.object({ graph: architectureSchema, tradeoffs: z.array(shortText).max(8) }).strict();
export const savedProposalSchema = assistantResultSchema.extend({ candidate: architectureSchema.nullable(), mode: z.enum(["change", "optimize"]) }).strict();

export const generateRequestSchema = z.object({
  projectId: z.uuid(), requirements: z.string().trim().min(10).max(4000),
  consent: z.literal(true),
}).strict();

export const assistantRequestSchema = z.object({
  projectId: z.uuid(), mode: z.enum(["ask", "change", "optimize"]),
  graph: architectureSchema,
  message: z.string().trim().min(3).max(4000),
  goal: z.enum(["scalability", "reliability", "security", "simplicity", "cost"]).default("scalability"),
  consent: z.literal(true),
}).strict();

export type GeneratedArchitecture = z.infer<typeof generatedArchitectureSchema>;
export type AssistantResult = z.infer<typeof assistantResultSchema>;
export type ArchitectureChange = z.infer<typeof architectureChangeSchema>;

export function boundedDailyLimit(value: string | undefined, fallback: number, hardCap: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.max(1, Math.min(hardCap, parsed)) : fallback;
}

export function exceededDailyQuota(userUsed: number, globalUsed: number, perUserLimit: number, globalLimit: number) {
  if (userUsed >= perUserLimit) return "user" as const;
  if (globalUsed >= globalLimit) return "application" as const;
  return null;
}
