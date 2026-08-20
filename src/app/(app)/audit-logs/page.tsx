import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { auditLogRepository } from "@/lib/repositories";

const ACTION_COLORS: Record<string, { bg: string; fg: string }> = {
  login: { bg: "var(--color-emerald-100)", fg: "var(--color-emerald-600)" },
  logout: { bg: "var(--color-border)", fg: "var(--color-text-secondary)" },
  login_failed: { bg: "#FEF2F2", fg: "#B91C1C" },
  permission_denied: { bg: "#FEF2F2", fg: "#B91C1C" },
  create: { bg: "var(--color-teal-100)", fg: "var(--color-teal-700)" },
  update: { bg: "var(--color-ocean-100)", fg: "var(--color-ocean-700)" },
  delete: { bg: "#FEF2F2", fg: "#B91C1C" },
  export: { bg: "var(--color-ocean-100)", fg: "var(--color-ocean-700)" },
  send: { bg: "var(--color-ocean-100)", fg: "var(--color-ocean-700)" },
  extract: { bg: "var(--color-teal-100)", fg: "var(--color-teal-700)" },
};

export default async function AuditLogsPage() {
  const { permissions } = await requireAuth();
  if (!hasPermission(permissions, "audit.view")) {
    redirect("/dashboard");
  }

  const logs = await auditLogRepository.list({ limit: 500 });

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          Most recent {logs.length} events, newest first.
        </p>
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>When</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>User</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Action</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Entity</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Details</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const color = ACTION_COLORS[log.action] ?? { bg: "var(--color-border)", fg: "var(--color-text-secondary)" };
              return (
                <tr key={log.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">{log.userEmail || "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: color.bg, color: color.fg }}>
                      {log.action.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5" style={{ color: "var(--color-text-secondary)" }}>
                    {log.entityType}{log.entityId ? ` · ${log.entityId}` : ""}
                  </td>
                  <td className="px-4 py-2.5" style={{ color: "var(--color-text-secondary)" }}>{log.details ?? "—"}</td>
                  <td className="px-4 py-2.5" style={{ color: "var(--color-text-muted)" }}>{log.ipAddress ?? "—"}</td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                  No activity recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
