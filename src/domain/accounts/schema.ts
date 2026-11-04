import { z } from "zod";
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const passwordSchema = z.string().min(15, "Use at least 15 characters.").max(128, "Use at most 128 characters.");
export const nameSchema = z.string().trim().min(1).max(80);
export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) }).strict();
export const signUpSchema = signInSchema.extend({ name: nameSchema, password: passwordSchema }).strict();
export const profileSchema = z.object({ name: nameSchema }).strict();
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema }).strict();
