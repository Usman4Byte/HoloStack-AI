import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { z } from "zod";
import { getDb } from "@/server/db";
import { boundedDailyLimit, exceededDailyQuota } from "@/domain/ai/schema";
import { savedGenerationSchema, savedProposalSchema } from "@/domain/ai/schema";
import { aiArtifacts, aiMessages, aiQuotaCounters, aiUsageRecords, projects, rateLimits } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { aiConfiguration, aiStatus } from "./provider";

const utcDay = () => new Date().toISOString().slice(0, 10);
export const dailyAILimits = () => ({
  perUser: boundedDailyLimit(process.env.AI_DAILY_USER_LIMIT, 3, 3),
  global: boundedDailyLimit(process.env.AI_DAILY_GLOBAL_LIMIT, 30, 30),
});
const userCounterKey = (userId: string, day: string) => `user:${userId}:${day}`;
const globalCounterKey = (day: string) => `global:${day}`;

export async function aiUsage(actor: Actor) {
  const day = utcDay();
  const keys = [userCounterKey(actor.id, day), globalCounterKey(day)];
  const rows = await getDb().select({ key: aiQuotaCounters.key, used: aiQuotaCounters.used }).from(aiQuotaCounters).where(inArray(aiQuotaCounters.key, keys));
  const usage = new Map(rows.map(row => [row.key, row.used]));
  const limits = dailyAILimits();
  const userUsed = usage.get(keys[0]) ?? 0, globalUsed = usage.get(keys[1]) ?? 0;
  return { ...aiStatus(), limits, user: { used: userUsed, remaining: Math.max(0, limits.perUser - userUsed) }, application: { used: globalUsed, remaining: Math.max(0, limits.global - globalUsed) }, resetsAt: new Date(new Date(`${day}T00:00:00.000Z`).getTime() + 86400000).toISOString() };
}

export async function reserveAIAction(actor: Actor, projectId: string, feature: "generate" | "copilot" | "optimize", fingerprint: string, lightweight = false) {
  const db = getDb(), day = utcDay(), limits = dailyAILimits(), now = new Date();
  const config = aiConfiguration();
  if (!config.ready) throw new ApiError(503, aiStatus().message ?? "Live AI is not configured.", "AI_NOT_CONFIGURED");
  const model = lightweight ? config.lightModel : config.model;
  const keys = [globalCounterKey(day), userCounterKey(actor.id, day)].sort();
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new ApiError(503, "AI quota protection is not configured.", "AI_QUOTA_UNAVAILABLE");
  const requestLockKey = createHmac("sha256", secret).update(`ai-request:${actor.id}:${projectId}:${feature}:${fingerprint}`).digest("hex");
  const usageId = randomUUID();
  return db.transaction(async tx => {
    const expiresAt = new Date(now.getTime() + 60_000);
    const insertedLock = await tx.insert(rateLimits).values({ key: requestLockKey, attempts: 1, expiresAt }).onConflictDoNothing().returning({ key: rateLimits.key });
    if (!insertedLock.length) {
      const [existingLock] = await tx.select().from(rateLimits).where(eq(rateLimits.key, requestLockKey)).for("update");
      if (existingLock && existingLock.expiresAt > now) throw new ApiError(409, "This identical AI request is already running. Wait for it to finish before retrying.", "AI_REQUEST_IN_PROGRESS");
      await tx.update(rateLimits).set({ attempts: 1, expiresAt }).where(eq(rateLimits.key, requestLockKey));
    }
    await tx.insert(aiQuotaCounters).values(keys.map(key => ({ key, day, used: 0, createdAt: now }))).onConflictDoNothing();
    const rows = await tx.select().from(aiQuotaCounters).where(inArray(aiQuotaCounters.key, keys)).orderBy(asc(aiQuotaCounters.key)).for("update");
    const global = rows.find(row => row.key === globalCounterKey(day));
    const user = rows.find(row => row.key === userCounterKey(actor.id, day));
    if (!global || !user) throw new ApiError(503, "AI quota storage is unavailable. No provider request was made.", "AI_QUOTA_UNAVAILABLE");
    const quota = exceededDailyQuota(user.used, global.used, limits.perUser, limits.global);
    if (quota) {
      throw new ApiError(429, quota === "user" ? "You have used today’s HoloStack AI allowance. It resets at 00:00 UTC." : "The application’s AI allowance is used for today. It resets at 00:00 UTC.", "AI_DAILY_QUOTA");
    }
    const [project] = await tx.select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId), eq(projects.workspaceId, actor.workspaceId), eq(projects.status, "active"))).limit(1);
    if (!project) throw new ApiError(404, "Active project not found.", "PROJECT_NOT_FOUND");
    for (const row of rows) await tx.update(aiQuotaCounters).set({ used: sql`${aiQuotaCounters.used} + 1` }).where(eq(aiQuotaCounters.key, row.key));
    await tx.insert(aiUsageRecords).values({ id: usageId, workspaceId: actor.workspaceId, userId: actor.id, projectId, feature, model, status: "started", errorCode: null, inputTokens: null, outputTokens: null, createdAt: now, completedAt: null });
    return { usageId, model, requestLockKey };
  });
}

export async function releaseAIRequestLock(key: string) {
  await getDb().delete(rateLimits).where(eq(rateLimits.key, key));
}

export async function finishAIAction(input: { usageId: string; status: "succeeded" | "failed"; errorCode?: string; inputTokens?: number | null; outputTokens?: number | null }) {
  await getDb().update(aiUsageRecords).set({ status: input.status, errorCode: input.errorCode?.slice(0, 80) ?? null, inputTokens: input.inputTokens ?? null, outputTokens: input.outputTokens ?? null, completedAt: new Date() }).where(eq(aiUsageRecords.id, input.usageId));
}

export async function saveAIArtifact(actor: Actor, input: { usageId: string; projectId: string; kind: "generation" | "proposal"; payload: unknown }) {
  const id = randomUUID();
  await getDb().insert(aiArtifacts).values({ id, usageId: input.usageId, workspaceId: actor.workspaceId, userId: actor.id, projectId: input.projectId, kind: input.kind, payload: input.payload, createdAt: new Date() });
  return id;
}

export async function recentAIMessages(actor: Actor, projectId: string) {
  const rows = await getDb().select({ role: aiMessages.role, content: aiMessages.content }).from(aiMessages)
    .where(and(eq(aiMessages.projectId, projectId), eq(aiMessages.workspaceId, actor.workspaceId), eq(aiMessages.userId, actor.id)))
    .orderBy(desc(aiMessages.createdAt), desc(aiMessages.id)).limit(6);
  return rows.reverse();
}

export async function recentAIArtifacts(actor: Actor, projectId: string) {
  const rows = await getDb().select({ id: aiArtifacts.id, kind: aiArtifacts.kind, payload: aiArtifacts.payload, createdAt: aiArtifacts.createdAt }).from(aiArtifacts)
    .where(and(eq(aiArtifacts.projectId, projectId), eq(aiArtifacts.workspaceId, actor.workspaceId), eq(aiArtifacts.userId, actor.id)))
    .orderBy(desc(aiArtifacts.createdAt), desc(aiArtifacts.id)).limit(6);
  type Artifact = { id: string; kind: "generation"; payload: z.infer<typeof savedGenerationSchema>; createdAt: string } | { id: string; kind: "proposal"; payload: z.infer<typeof savedProposalSchema>; createdAt: string };
  const artifacts: Artifact[] = [];
  for (const row of rows) {
    if (row.kind === "generation") {
      const parsed = savedGenerationSchema.safeParse(row.payload);
      if (parsed.success) artifacts.push({ id: row.id, kind: "generation", payload: parsed.data, createdAt: row.createdAt.toISOString() });
    }
    if (row.kind === "proposal") {
      const parsed = savedProposalSchema.safeParse(row.payload);
      if (parsed.success && parsed.data.candidate) artifacts.push({ id: row.id, kind: "proposal", payload: parsed.data, createdAt: row.createdAt.toISOString() });
    }
  }
  return artifacts;
}

export async function saveAIConversation(actor: Actor, input: { projectId: string; usageId: string; question: string; answer: string }) {
  const now = new Date();
  await getDb().transaction(async tx => {
    await tx.insert(aiMessages).values([
      { id: randomUUID(), workspaceId: actor.workspaceId, userId: actor.id, projectId: input.projectId, usageId: input.usageId, role: "user", content: input.question, createdAt: now },
      { id: randomUUID(), workspaceId: actor.workspaceId, userId: actor.id, projectId: input.projectId, usageId: input.usageId, role: "assistant", content: input.answer, createdAt: new Date(now.getTime() + 1) },
    ]);
  });
}

export async function aiStats(actor: Actor) {
  const [row] = await getDb().select({ value: count() }).from(aiUsageRecords).where(eq(aiUsageRecords.workspaceId, actor.workspaceId));
  return { calls: row.value };
}
