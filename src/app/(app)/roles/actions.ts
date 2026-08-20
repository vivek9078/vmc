"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { roleRepository } from "@/lib/repositories";
import { PERMISSION_IDS } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const roleSchema = z.object({
  name: z.string().min(1, "Role name is required").max(80),
  description: z.string().max(300).optional(),
  permissionIds: z.array(z.enum(PERMISSION_IDS as [string, ...string[]])),
});

export type RoleInput = z.infer<typeof roleSchema>;

export async function createRoleAction(input: RoleInput) {
  const ctx = await requireAuth("roles.manage");

  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const role = await roleRepository.create({ ...parsed.data, isSystem: false });
  await logAudit({ userId: ctx.userId, userEmail: ctx.email, action: "create", entityType: "Role", entityId: role.id, details: role.name });
  return { ok: true as const, role };
}

export async function updateRoleAction(roleId: string, input: RoleInput) {
  const ctx = await requireAuth("roles.manage");

  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const role = await roleRepository.update(roleId, parsed.data);
  await logAudit({ userId: ctx.userId, userEmail: ctx.email, action: "update", entityType: "Role", entityId: role.id, details: role.name });
  return { ok: true as const, role };
}

export async function deleteRoleAction(roleId: string) {
  const ctx = await requireAuth("roles.manage");

  try {
    await roleRepository.delete(roleId);
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Could not delete role." };
  }

  await logAudit({ userId: ctx.userId, userEmail: ctx.email, action: "delete", entityType: "Role", entityId: roleId });
  return { ok: true as const };
}
