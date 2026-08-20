import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { importBatchRepository } from "@/lib/repositories";
import { ImportHistoryTable } from "./import-history-table";

export default async function ImportCenterPage() {
  const { permissions } = await requireAuth("inventory.manage_rates");
  const canManage = hasPermission(permissions, "inventory.manage_rates");
  const batches = await importBatchRepository.list();

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Import History</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          A combined log of every CSV import across the app, with rollback. To upload a new file, use the
          &quot;Upload&quot; card on the Hotels, Transport, Activities, or Add-ons page — each only syncs its own
          category, so mixed-content files can&apos;t cross-contaminate other inventory.
        </p>
      </div>

      <ImportHistoryTable batches={batches} canManage={canManage} />
    </div>
  );
}
