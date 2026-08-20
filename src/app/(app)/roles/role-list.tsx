"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { RoleForm } from "./role-form";
import { createRoleAction, updateRoleAction, deleteRoleAction, type RoleInput } from "./actions";
import { PERMISSIONS } from "@/lib/rbac";
import type { Role } from "@/types/domain";

export function RoleList({ roles }: { roles: Role[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(role: Role) {
    if (!confirm(`Delete role "${role.name}"? Users assigned to it will need a new role.`)) return;
    setDeleteError(null);
    const result = await deleteRoleAction(role.id);
    if (!result.ok) {
      setDeleteError(result.error ?? "Could not delete role.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {deleteError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{deleteError}</p>}

      {!creating && (
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2 rounded-xl"
          style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
        >
          <Plus size={15} /> Add Role
        </button>
      )}

      {creating && (
        <RoleForm
          onCancel={() => setCreating(false)}
          onSubmit={async (input: RoleInput) => {
            const result = await createRoleAction(input);
            if (result.ok) {
              setCreating(false);
              router.refresh();
            }
            return result;
          }}
        />
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {roles.map((role) => (
          <div key={role.id} className="card-surface p-5">
            {editingId === role.id ? (
              <RoleForm
                initial={{ name: role.name, description: role.description ?? "", permissionIds: role.permissionIds }}
                isSystem={role.isSystem}
                onCancel={() => setEditingId(null)}
                onSubmit={async (input: RoleInput) => {
                  const result = await updateRoleAction(role.id, input);
                  if (result.ok) {
                    setEditingId(null);
                    router.refresh();
                  }
                  return result;
                }}
              />
            ) : (
              <>
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} style={{ color: "var(--color-teal-600)" }} />
                    <h3 className="font-semibold text-sm">{role.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditingId(role.id)} className="p-1.5 rounded-lg" style={{ color: "var(--color-text-secondary)" }} title="Edit role">
                      <Pencil size={14} />
                    </button>
                    {!role.isSystem && (
                      <button onClick={() => handleDelete(role)} className="p-1.5 rounded-lg" style={{ color: "#B91C1C" }} title="Delete role">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {role.description && (
                  <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>{role.description}</p>
                )}
                <p className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
                  {role.permissionIds.length} of {PERMISSIONS.length} permissions
                  {role.isSystem && <span className="ml-1.5 px-1.5 py-0.5 rounded" style={{ background: "var(--color-teal-100)", color: "var(--color-teal-700)" }}>Built-in</span>}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
