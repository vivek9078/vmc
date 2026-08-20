"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { userRepository, roleRepository } from "@/lib/repositories";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { logAudit } from "@/lib/audit";

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  email: z.string().email("Invalid email").max(150),
  password: z.string().min(1, "Password is required"),
  roleId: z.string().min(1, "Role is required"),
  status: z.enum(["Active", "Inactive"]),
});

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  roleId: z.string().min(1, "Role is required"),
  status: z.enum(["Active", "Inactive"]),
  newPassword: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

async function assertRoleExists(roleId: string) {
  const role = await roleRepository.get(roleId);
  if (!role) throw new Error("Selected role no longer exists.");
}

export async function createUserAction(input: CreateUserInput) {
  const ctx = await requireAuth("users.manage");

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const strength = validatePasswordStrength(parsed.data.password);
  if (!strength.valid) {
    return { ok: false as const, error: strength.message, fieldErrors: { password: [strength.message ?? ""] } };
  }

  try {
    await assertRoleExists(parsed.data.roleId);
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Invalid role." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  try {
    const user = await userRepository.create({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      roleId: parsed.data.roleId,
      status: parsed.data.status,
      isSuperAdmin: false, // Super Admin can only ever be granted by editing the Users sheet directly, never via this form.
      failedLoginAttempts: 0,
    });
    await logAudit({ userId: ctx.userId, userEmail: ctx.email, action: "create", entityType: "User", entityId: user.id, details: user.email });
    return { ok: true as const, user: { ...user, passwordHash: undefined } };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Could not create user." };
  }
}

export async function updateUserAction(userId: string, input: UpdateUserInput) {
  const ctx = await requireAuth("users.manage");

  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const target = await userRepository.get(userId);
  if (!target) return { ok: false as const, error: "User not found." };

  if (target.isSuperAdmin && parsed.data.status === "Inactive") {
    return { ok: false as const, error: "The Super Admin account cannot be deactivated here." };
  }
  if (target.id === ctx.userId && parsed.data.status === "Inactive") {
    return { ok: false as const, error: "You cannot deactivate your own account." };
  }

  try {
    await assertRoleExists(parsed.data.roleId);
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Invalid role." };
  }

  const update: Parameters<typeof userRepository.update>[1] = {
    name: parsed.data.name,
    roleId: parsed.data.roleId,
    status: parsed.data.status,
  };

  if (parsed.data.newPassword) {
    const strength = validatePasswordStrength(parsed.data.newPassword);
    if (!strength.valid) {
      return { ok: false as const, error: strength.message, fieldErrors: { newPassword: [strength.message ?? ""] } };
    }
    update.passwordHash = await hashPassword(parsed.data.newPassword);
    update.failedLoginAttempts = 0;
    update.lockedUntil = undefined;
  }

  const user = await userRepository.update(userId, update);
  await logAudit({ userId: ctx.userId, userEmail: ctx.email, action: "update", entityType: "User", entityId: user.id, details: user.email });
  return { ok: true as const, user: { ...user, passwordHash: undefined } };
}
