import { formatCurrency } from "@/lib/currency";
import { activityRepository, supplierRepository } from "@/lib/repositories";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { AddActivityForm } from "./add-activity-form";
import { CsvSyncForm } from "@/app/(app)/import-center/csv-sync-form";

export default async function ActivitiesPage() {
  const { permissions } = await requireAuth();
  const canSeeCost = hasPermission(permissions, "quotation.view_supplier_cost") || hasPermission(permissions, "inventory.manage_activities");
  const canManage = hasPermission(permissions, "inventory.manage_activities");
  const canImport = hasPermission(permissions, "inventory.manage_rates");

  const [items, suppliers] = await Promise.all([activityRepository.list(), supplierRepository.list()]);
  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "—";

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Activities Inventory</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{items.length} activities</p>
      </div>

      {canManage && <AddActivityForm suppliers={suppliers} />}

      {canImport && (
        <CsvSyncForm
          expectedType="activity"
          title="Upload Activities / Tours"
          hint="Activity/Tour Name, City, Duration, Schedule, Price, etc. Every row here is synced as an activity."
        />
      )}

      <div className="card-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
              <th className="px-5 py-3 font-medium">Activity</th>
              <th className="px-5 py-3 font-medium">City</th>
              <th className="px-5 py-3 font-medium">Supplier</th>
              <th className="px-5 py-3 font-medium">Duration</th>
              {canSeeCost && <th className="px-5 py-3 font-medium">Cost</th>}
              <th className="px-5 py-3 font-medium">Selling</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td className="px-5 py-3 font-medium">{a.name}</td>
                <td className="px-5 py-3">{a.city}</td>
                <td className="px-5 py-3" style={{ color: "var(--color-text-secondary)" }}>{supplierName(a.supplierId)}</td>
                <td className="px-5 py-3">{a.duration}</td>
                {canSeeCost && <td className="px-5 py-3">{formatCurrency(a.cost)}</td>}
                <td className="px-5 py-3 font-medium">{formatCurrency(a.selling)}</td>
                <td className="px-5 py-3">
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                    style={{ background: "var(--color-emerald-100)", color: "var(--color-emerald-600)" }}>
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
