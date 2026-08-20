import { supplierRepository } from "@/lib/repositories";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { AddSupplierForm } from "./add-supplier-form";

export default async function SuppliersPage() {
  const { permissions } = await requireAuth();
  const canManage = hasPermission(permissions, "inventory.manage_suppliers");
  const suppliers = await supplierRepository.list();

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Suppliers</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{suppliers.length} suppliers</p>
      </div>

      {canManage && <AddSupplierForm />}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map((s) => (
          <div key={s.id} className="card-surface p-5">
            <h3 className="font-semibold text-sm mb-1">{s.name}</h3>
            <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>{s.company}</p>
            <div className="space-y-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
              <div>{s.phone}</div>
              <div>{s.email}</div>
              <div>{s.country}{s.paymentTerms ? ` · ${s.paymentTerms}` : ""}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
