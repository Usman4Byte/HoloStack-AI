import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/server/db";
import { users, sessions, workspaceMembers, workspaces } from "@/server/db/schema";
import { ApiError } from "@/server/http/errors";
import { appOrigin } from "@/server/http/request";

export const sessionHash = (token: string) => createHash("sha256").update(token).digest("hex");
export function sessionSettings() {
  const secure = appOrigin().protocol === "https:";
  return { name: secure ? "__Host-holostack" : "holostack_session", secure, httpOnly: true, sameSite: "lax" as const, path: "/" };
}
export function newSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  return { token, row: { tokenHash: sessionHash(token), userId, createdAt: new Date(), expiresAt: new Date(Date.now() + 7 * 86400000) } };
}
export async function setSessionCookie(token: string, expires: Date) {
  (await cookies()).set({ ...sessionSettings(), value: token, expires });
}
export async function clearSessionCookie() {
  (await cookies()).set({ ...sessionSettings(), value: "", expires: new Date(0), maxAge: 0 });
}
export async function currentTokenHash() {
  const token = (await cookies()).get(sessionSettings().name)?.value;
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? sessionHash(token) : null;
}
export async function getActor() {
  const tokenHash = await currentTokenHash();
  if (!tokenHash) return null;
  const rows = await getDb().select({
    id: users.id, name: users.name, email: users.email, createdAt: users.createdAt,
    workspaceId: workspaces.id, workspaceName: workspaces.name, role: workspaceMembers.role,
    tokenHash: sessions.tokenHash,
  }).from(sessions).innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(workspaceMembers, eq(workspaceMembers.userId, users.id))
    .innerJoin(workspaces, and(eq(workspaces.id, workspaceMembers.workspaceId), eq(workspaces.ownerId, users.id)))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date()))).limit(1);
  return rows[0] ?? null;
}
export type Actor = NonNullable<Awaited<ReturnType<typeof getActor>>>;
export async function requireActor() {
  const actor = await getActor();
  if (!actor) throw new ApiError(401, "Please sign in to continue.", "UNAUTHENTICATED");
  return actor;
}
export function requireWriter(actor: Actor) {
  if (!["owner", "editor"].includes(actor.role)) throw new ApiError(403, "This workspace is read-only for your account.");
}
export function publicActor(actor: Actor) {
  return { id: actor.id, name: actor.name, email: actor.email, workspaceName: actor.workspaceName };
}
