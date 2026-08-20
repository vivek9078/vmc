import { formatCurrency } from "@/lib/currency";
import { hotelRepository, supplierRepository } from "@/lib/repositories";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { AddHotelForm } from "./add-hotel-form";
import { CsvSyncForm } from "@/app/(app)/import-center/csv-sync-form";

export default async function HotelsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; q?: string }>;
}) {
  const params = await searchParams;
  const { permissions } = await requireAuth();
  const canSeeCost = hasPermission(permissions, "quotation.view_supplier_cost") || hasPermission(permissions, "inventory.manage_hotels");
  const canManage = hasPermission(permissions, "inventory.manage_hotels");
  const canImport = hasPermission(permissions, "inventory.manage_rates");

  const [hotels, suppliers] = await Promise.all([
    hotelRepository.list({ city: params.city, search: params.q }),
    supplierRepository.list(),
  ]);
  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "—";

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Hotels Inventory</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{hotels.length} hotels</p>
        </div>
      </div>

      {canManage && <AddHotelForm suppliers={suppliers} />}

      {canImport && (
        <CsvSyncForm
          expectedType="hotel"
          title="Upload Hotel Rate Sheet"
          hint="Hotel Name, City, Room Type, Meal Plan, Season, Rate, etc. — every row here is synced as a hotel, so keep transport/activity data in their own pages."
        />
      )}

      <div className="card-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
              <th className="px-5 py-3 font-medium">Hotel</th>
              <th className="px-5 py-3 font-medium">City</th>
              <th className="px-5 py-3 font-medium">Star</th>
              <th className="px-5 py-3 font-medium">Supplier</th>
              {canSeeCost && <th className="px-5 py-3 font-medium">Supplier Cost</th>}
              <th className="px-5 py-3 font-medium">Selling Price</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {hotels.map((h) => (
              <tr key={h.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td className="px-5 py-3 font-medium">{h.name}</td>
                <td className="px-5 py-3">{h.city}</td>
                <td className="px-5 py-3">{"★".repeat(h.starRating)}</td>
                <td className="px-5 py-3" style={{ color: "var(--color-text-secondary)" }}>{supplierName(h.supplierId)}</td>
                {canSeeCost && <td className="px-5 py-3">{formatCurrency(h.supplierCost)}</td>}
                <td className="px-5 py-3 font-medium">{formatCurrency(h.sellingCost)}</td>
                <td className="px-5 py-3">
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                    style={h.status === "Active"
                      ? { background: "var(--color-emerald-100)", color: "var(--color-emerald-600)" }
                      : { background: "var(--color-border)", color: "var(--color-text-muted)" }}>
                    {h.status}
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
