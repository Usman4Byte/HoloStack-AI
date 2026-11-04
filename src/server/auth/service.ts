import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { users, sessions, workspaces, workspaceMembers } from "@/server/db/schema";
import { hashPassword, verifyPassword } from "./password";
import { currentTokenHash, newSession, setSessionCookie, type Actor } from "./session";
import { ApiError } from "@/server/http/errors";

export async function signUp(input: { email: string; name: string; password: string }) {
  const userId = randomUUID(), workspaceId = randomUUID();
  const passwordHash = await hashPassword(input.password);
  const session = newSession(userId);
  const oldTokenHash = await currentTokenHash();
  await getDb().transaction(async tx => {
    const inserted = await tx.insert(users).values({ id: userId, email: input.email, name: input.name, passwordHash, createdAt: new Date() }).onConflictDoNothing({ target: users.email }).returning({ id: users.id });
    if (!inserted.length) throw new ApiError(409, "Unable to create this account. Try signing in instead.", "ACCOUNT_UNAVAILABLE");
    await tx.insert(workspaces).values({ id: workspaceId, ownerId: userId, name: "Personal workspace", projectSlots: 0, createdAt: new Date() });
    await tx.insert(workspaceMembers).values({ workspaceId, userId, role: "owner" });
    if (oldTokenHash) await tx.delete(sessions).where(eq(sessions.tokenHash, oldTokenHash));
    await tx.insert(sessions).values(session.row);
  });
  await setSessionCookie(session.token, session.row.expiresAt);
}
export async function signIn(input: { email: string; password: string }) {
  const [user] = await getDb().select({ id: users.id, passwordHash: users.passwordHash }).from(users).where(eq(users.email, input.email)).limit(1);
  const valid = await verifyPassword(input.password, user?.passwordHash ?? null);
  if (!user || !valid) throw new ApiError(401, "Email or password is incorrect.", "INVALID_CREDENTIALS");
  const session = newSession(user.id);
  const oldTokenHash = await currentTokenHash();
  await getDb().transaction(async tx => {
    // Lock the credential row to serialize login against a concurrent password change.
    const [current] = await tx.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).for("update");
    if (!current || current.passwordHash !== user.passwordHash) throw new ApiError(401, "Email or password is incorrect.", "INVALID_CREDENTIALS");
    if (oldTokenHash) await tx.delete(sessions).where(eq(sessions.tokenHash, oldTokenHash));
    await tx.insert(sessions).values(session.row);
  });
  await setSessionCookie(session.token, session.row.expiresAt);
}
export async function changePassword(actor: Actor, input: { currentPassword: string; newPassword: string }) {
  const [user] = await getDb().select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, actor.id));
  if (!user || !await verifyPassword(input.currentPassword, user.passwordHash)) throw new ApiError(400, "Current password is incorrect.");
  const passwordHash = await hashPassword(input.newPassword);
  await getDb().transaction(async tx => {
    const updated = await tx.update(users).set({ passwordHash }).where(and(eq(users.id, actor.id), eq(users.passwordHash, user.passwordHash))).returning({ id: users.id });
    if (!updated.length) throw new ApiError(409, "Account changed. Sign in and retry.");
    await tx.delete(sessions).where(eq(sessions.userId, actor.id));
  });
}
