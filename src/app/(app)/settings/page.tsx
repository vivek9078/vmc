import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { getWorkbookPath } from "@/lib/excel";

export default async function SettingsPage() {
  const ctx = await requireAuth();
  if (!hasPermission(ctx.permissions, "settings.manage")) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>Admin-only.</p>
      </div>

      <div className="card-surface p-5">
        <h2 className="text-sm font-semibold mb-3">Data Source</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-emerald-600)" }} />
          Local Excel workbook
        </div>
        <p className="text-xs mt-2 font-mono" style={{ color: "var(--color-text-muted)" }}>{getWorkbookPath()}</p>
        <p className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
          Every table (Users, Roles, Queries, Quotations, Bookings, Payments, Audit Logs, ...) lives in
          one sheet inside this file. It's created automatically on first run and updated in place —
          no external service, no credentials.
        </p>
      </div>

      <div className="card-surface p-5">
        <h2 className="text-sm font-semibold mb-2">Roles & Permissions</h2>
        <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
          Roles are now fully editable — create, rename, or change what any role can see and do
          from the Roles admin screen.
        </p>
        <Link
          href="/roles"
          className="inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{ background: "var(--color-teal-100)", color: "var(--color-teal-700)" }}
        >
          Manage Roles &rarr;
        </Link>
      </div>

      <div className="card-surface p-5">
        <h2 className="text-sm font-semibold mb-2">Users</h2>
        <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
          Invite staff, assign roles, and deactivate accounts.
        </p>
        <Link
          href="/users"
          className="inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{ background: "var(--color-teal-100)", color: "var(--color-teal-700)" }}
        >
          Manage Users &rarr;
        </Link>
      </div>
    </div>
  );
}
