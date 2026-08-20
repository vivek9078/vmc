"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, ShieldCheck } from "lucide-react";
import { UserForm, type UserFormValue } from "./user-form";
import { createUserAction, updateUserAction } from "./actions";
import type { Role } from "@/types/domain";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  roleId: string;
  status: "Active" | "Inactive";
  isSuperAdmin: boolean;
  lastLoginAt?: string;
}

export function UserList({ users, roles, currentUserId }: { users: SafeUser[]; roles: Role[]; currentUserId: string }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const roleName = (roleId: string) => roles.find((r) => r.id === roleId)?.name ?? "Unknown";

  return (
    <div className="space-y-4">
      {!creating && (
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2 rounded-xl"
          style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
        >
          <Plus size={15} /> Add User
        </button>
      )}

      {creating && (
        <UserForm
          roles={roles}
          mode="create"
          onCancel={() => setCreating(false)}
          onSubmit={async (input: UserFormValue) => {
            const result = await createUserAction({
              name: input.name,
              email: input.email ?? "",
              password: input.password ?? "",
              roleId: input.roleId,
              status: input.status,
            });
            if (result.ok) {
              setCreating(false);
              router.refresh();
            }
            return result;
          }}
        />
      )}

      <div className="card-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Name</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Email</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Role</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <Fragment key={u.id}>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td className="px-4 py-2.5 font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {u.name}
                      {u.isSuperAdmin && (
                        <span title="Super Admin">
                          <ShieldCheck size={13} style={{ color: "var(--color-teal-600)" }} />
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2.5" style={{ color: "var(--color-text-secondary)" }}>{u.email}</td>
                  <td className="px-4 py-2.5" style={{ color: "var(--color-text-secondary)" }}>{roleName(u.roleId)}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className="text-[11px] px-1.5 py-0.5 rounded"
                      style={
                        u.status === "Active"
                          ? { background: "var(--color-emerald-100)", color: "var(--color-emerald-600)" }
                          : { background: "var(--color-border)", color: "var(--color-text-muted)" }
                      }
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => setEditingId(editingId === u.id ? null : u.id)} className="p-1.5 rounded-lg" style={{ color: "var(--color-text-secondary)" }} title="Edit user">
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
                {editingId === u.id && (
                  <tr>
                    <td colSpan={5} className="px-4 pb-4">
                      <UserForm
                        roles={roles}
                        mode="edit"
                        disableStatus={u.isSuperAdmin || u.id === currentUserId}
                        initial={{ name: u.name, roleId: u.roleId, status: u.status }}
                        onCancel={() => setEditingId(null)}
                        onSubmit={async (input: UserFormValue) => {
                          const result = await updateUserAction(u.id, {
                            name: input.name,
                            roleId: input.roleId,
                            status: input.status,
                            newPassword: input.newPassword,
                          });
                          if (result.ok) {
                            setEditingId(null);
                            router.refresh();
                          }
                          return result;
                        }}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
