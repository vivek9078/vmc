"use client";

import { useState } from "react";
import { PERMISSIONS } from "@/lib/rbac";
import type { RoleInput } from "./actions";

const INPUT = "w-full rounded-xl border px-3 py-2 text-sm outline-none";
const LABEL = "block text-xs font-medium mb-1.5";

const GROUPS = Array.from(new Set(PERMISSIONS.map((p) => p.group)));

export function RoleForm({
  initial,
  isSystem,
  onSubmit,
  onCancel,
}: {
  initial?: RoleInput;
  isSystem?: boolean;
  onSubmit: (input: RoleInput) => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined> }>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<RoleInput>(initial ?? { name: "", description: "", permissionIds: [] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePermission(id: string) {
    setForm((f) => ({
      ...f,
      permissionIds: f.permissionIds.includes(id)
        ? f.permissionIds.filter((p) => p !== id)
        : [...f.permissionIds, id],
    }));
  }

  function toggleGroup(group: string, ids: string[]) {
    const allSelected = ids.every((id) => form.permissionIds.includes(id));
    setForm((f) => ({
      ...f,
      permissionIds: allSelected
        ? f.permissionIds.filter((p) => !ids.includes(p))
        : Array.from(new Set([...f.permissionIds, ...ids])),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await onSubmit(form);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save role.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Role Name</label>
          <input
            required
            disabled={isSystem}
            className={INPUT}
            style={{ borderColor: "var(--color-border)" }}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          {isSystem && <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>Built-in role names can&apos;t be changed.</p>}
        </div>
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Description</label>
          <input
            className={INPUT}
            style={{ borderColor: "var(--color-border)" }}
            value={form.description ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Permissions</label>
        <div className="grid sm:grid-cols-2 gap-3">
          {GROUPS.map((group) => {
            const groupPermissions = PERMISSIONS.filter((p) => p.group === group);
            const groupIds = groupPermissions.map((p) => p.id);
            const allSelected = groupIds.every((id) => form.permissionIds.includes(id));
            return (
              <div key={group} className="rounded-xl p-3" style={{ border: "1px solid var(--color-border)" }}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group, groupIds)}
                  className="text-xs font-semibold mb-2 uppercase tracking-wide"
                  style={{ color: allSelected ? "var(--color-teal-700)" : "var(--color-text-muted)" }}
                >
                  {group}
                </button>
                <div className="space-y-1.5">
                  {groupPermissions.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.permissionIds.includes(p.id)}
                        onChange={() => togglePermission(p.id)}
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium px-4 py-2 rounded-xl"
          style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
        >
          {submitting ? "Saving…" : "Save Role"}
        </button>
      </div>
    </form>
  );
}
