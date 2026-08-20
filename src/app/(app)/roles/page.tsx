import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { roleRepository } from "@/lib/repositories";
import { RoleList } from "./role-list";

export default async function RolesPage() {
  const { permissions } = await requireAuth();
  if (!hasPermission(permissions, "roles.manage")) {
    redirect("/dashboard");
  }

  const roles = await roleRepository.list();

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Roles &amp; Permissions</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          {roles.length} roles. Changes take effect immediately for every user assigned to that role.
        </p>
      </div>

      <RoleList roles={roles} />
    </div>
  );
}
