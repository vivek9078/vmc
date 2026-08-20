"use client";

import { useState } from "react";
import type { Role } from "@/types/domain";

const INPUT = "w-full rounded-xl border px-3 py-2 text-sm outline-none";
const LABEL = "block text-xs font-medium mb-1.5";

export interface UserFormValue {
  name: string;
  email?: string; // omitted (and disabled) when editing — email is immutable after creation
  roleId: string;
  status: "Active" | "Inactive";
  password?: string; // required on create
  newPassword?: string; // optional on edit
}

export function UserForm({
  roles,
  initial,
  mode,
  disableStatus,
  onSubmit,
  onCancel,
}: {
  roles: Role[];
  initial?: UserFormValue;
  mode: "create" | "edit";
  disableStatus?: boolean;
  onSubmit: (input: UserFormValue) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<UserFormValue>(
    initial ?? { name: "", email: "", roleId: roles[0]?.id ?? "", status: "Active", password: "" }
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await onSubmit(form);
    setSubmitting(false);
    if (!result.ok) setError(result.error ?? "Could not save user.");
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Full Name</label>
          <input required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Email</label>
          <input
            type="email"
            required={mode === "create"}
            disabled={mode === "edit"}
            className={INPUT}
            style={{ borderColor: "var(--color-border)", opacity: mode === "edit" ? 0.6 : 1 }}
            value={form.email ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Role</label>
          <select
            required
            className={INPUT}
            style={{ borderColor: "var(--color-border)" }}
            value={form.roleId}
            onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Status</label>
          <select
            disabled={disableStatus}
            className={INPUT}
            style={{ borderColor: "var(--color-border)", opacity: disableStatus ? 0.6 : 1 }}
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "Active" | "Inactive" }))}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div>
        <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>
          {mode === "create" ? "Password" : "New Password (leave blank to keep current)"}
        </label>
        <input
          type="password"
          required={mode === "create"}
          className={INPUT}
          style={{ borderColor: "var(--color-border)" }}
          value={mode === "create" ? form.password ?? "" : form.newPassword ?? ""}
          onChange={(e) =>
            setForm((f) => (mode === "create" ? { ...f, password: e.target.value } : { ...f, newPassword: e.target.value }))
          }
        />
        <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
          At least 10 characters, with an uppercase letter, a lowercase letter, and a number.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel}
          className="text-sm font-medium px-4 py-2 rounded-xl" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
          Cancel
        </button>
        <button type="submit" disabled={submitting}
          className="text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}>
          {submitting ? "Saving…" : mode === "create" ? "Create User" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
