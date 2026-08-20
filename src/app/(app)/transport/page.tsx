import { formatCurrency } from "@/lib/currency";
import { transportRepository, supplierRepository } from "@/lib/repositories";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { AddTransportForm } from "./add-transport-form";
import { CsvSyncForm } from "@/app/(app)/import-center/csv-sync-form";

export default async function TransportPage() {
  const { permissions } = await requireAuth();
  const canSeeCost = hasPermission(permissions, "quotation.view_supplier_cost") || hasPermission(permissions, "inventory.manage_transport");
  const canManage = hasPermission(permissions, "inventory.manage_transport");
  const canImport = hasPermission(permissions, "inventory.manage_rates");

  const [items, suppliers] = await Promise.all([transportRepository.list(), supplierRepository.list()]);
  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "—";

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Transport Inventory</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{items.length} vehicles</p>
      </div>

      {canManage && <AddTransportForm suppliers={suppliers} />}

      {canImport && (
        <CsvSyncForm
          expectedType="transport"
          title="Upload Transport Rates"
          hint="Duty Code, A/From, B/To, Service, Distance, per-vehicle price columns (4 SEATER, 7 SEATER, ...), etc. Every row here is synced as a transport item."
        />
      )}

      <div className="card-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
              <th className="px-5 py-3 font-medium">Vehicle Type</th>
              <th className="px-5 py-3 font-medium">Capacity</th>
              <th className="px-5 py-3 font-medium">Supplier</th>
              <th className="px-5 py-3 font-medium">Pickup → Drop</th>
              {canSeeCost && <th className="px-5 py-3 font-medium">Cost</th>}
              <th className="px-5 py-3 font-medium">Selling</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td className="px-5 py-3 font-medium">{t.vehicleType}</td>
                <td className="px-5 py-3">{t.capacity} pax</td>
                <td className="px-5 py-3" style={{ color: "var(--color-text-secondary)" }}>{supplierName(t.supplierId)}</td>
                <td className="px-5 py-3">{t.pickup} → {t.drop}</td>
                {canSeeCost && <td className="px-5 py-3">{formatCurrency(t.cost)}</td>}
                <td className="px-5 py-3 font-medium">{formatCurrency(t.selling)}</td>
                <td className="px-5 py-3">
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                    style={{ background: "var(--color-emerald-100)", color: "var(--color-emerald-600)" }}>
                    {t.status}
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
