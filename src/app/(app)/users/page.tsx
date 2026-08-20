import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { userRepository, roleRepository } from "@/lib/repositories";
import { UserList, type SafeUser } from "./user-list";

export default async function UsersPage() {
  const ctx = await requireAuth();
  if (!hasPermission(ctx.permissions, "users.manage")) {
    redirect("/dashboard");
  }

  const [users, roles] = await Promise.all([userRepository.list(), roleRepository.list()]);

  // Never send password hashes to the client, even inside a Server Component prop.
  const safeUsers: SafeUser[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    roleId: u.roleId,
    status: u.status,
    isSuperAdmin: u.isSuperAdmin,
    lastLoginAt: u.lastLoginAt,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Users</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{users.length} accounts</p>
      </div>

      <UserList users={safeUsers} roles={roles} currentUserId={ctx.userId} />
    </div>
  );
}
