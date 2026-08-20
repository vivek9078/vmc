import { formatCurrency } from "@/lib/currency";
import { addOnRepository } from "@/lib/repositories";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { CsvSyncForm } from "@/app/(app)/import-center/csv-sync-form";

export default async function AddOnsPage() {
  const { permissions } = await requireAuth();
  const canImport = hasPermission(permissions, "inventory.manage_rates");
  const items = await addOnRepository.list();

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Add-ons &amp; Services</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          {items.length} add-ons — airport pickups, guides, surcharges, and other ancillary services.
        </p>
      </div>

      {canImport && (
        <CsvSyncForm
          expectedType="addon"
          title="Upload Add-ons / Services"
          hint="Add-on/Service Name, Service Type, Price, Duration, etc. Every row here is synced as an add-on."
        />
      )}

      {items.length === 0 ? (
        <div className="card-surface p-8 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
          No add-ons yet. Upload a CSV above to populate this list.
        </div>
      ) : (
        <div className="card-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
                <th className="px-5 py-3 font-medium">Add-on / Service</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Vehicle</th>
                <th className="px-5 py-3 font-medium">Duration</th>
                <th className="px-5 py-3 font-medium">Season</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td className="px-5 py-3 font-medium">
                    {a.name}
                    {a.description && <div className="text-xs font-normal mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{a.description}</div>}
                  </td>
                  <td className="px-5 py-3" style={{ color: "var(--color-text-secondary)" }}>{a.serviceType ?? "—"}</td>
                  <td className="px-5 py-3">{a.vehicleType ?? "—"}</td>
                  <td className="px-5 py-3">{a.duration ?? "—"}</td>
                  <td className="px-5 py-3">{a.season ?? "—"}</td>
                  <td className="px-5 py-3 font-medium">{formatCurrency(a.price)}</td>
                  <td className="px-5 py-3">
                    <span
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                      style={{ background: "var(--color-emerald-100)", color: "var(--color-emerald-600)" }}
                    >
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
