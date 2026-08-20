import { hotelRepository, transportRepository, activityRepository, addOnRepository, importBatchRepository } from "@/lib/repositories";
import type { SyncEntityType } from "@/types/domain";

/**
 * Reverses one import batch: records this import *created* are soft-deleted
 * (status → "Inactive" — none of the four repositories expose a hard
 * delete, by design, since other records may already reference them), and
 * records it *updated* have the fields it changed restored from the
 * snapshot captured at commit time. Unrelated records, and any manual edits
 * made to a different record since, are untouched.
 */
export async function rollbackImportBatch(batchId: string, rolledBackByUserId: string): Promise<{ restored: number; deactivated: number }> {
  const batch = await importBatchRepository.get(batchId);
  if (!batch) throw new Error("Import batch not found.");
  if (batch.status === "RolledBack") throw new Error("This import has already been rolled back.");

  const records = await importBatchRepository.listRecords(batchId);
  let restored = 0;
  let deactivated = 0;

  for (const record of records) {
    if (record.action === "created") {
      await setInactive(record.entityType, record.entityId);
      deactivated += 1;
    } else if (record.action === "updated" && record.previousValue) {
      let previous: Record<string, unknown>;
      try {
        previous = JSON.parse(record.previousValue);
      } catch {
        continue;
      }
      await restoreFields(record.entityType, record.entityId, previous);
      restored += 1;
    }
  }

  await importBatchRepository.update(batchId, {
    status: "RolledBack",
    rolledBackAt: new Date().toISOString(),
    rolledBackByUserId,
  });

  return { restored, deactivated };
}

async function setInactive(entityType: SyncEntityType, entityId: string): Promise<void> {
  try {
    if (entityType === "hotel") await hotelRepository.update(entityId, { status: "Inactive" });
    else if (entityType === "transport") await transportRepository.update(entityId, { status: "Inactive" });
    else if (entityType === "activity") await activityRepository.update(entityId, { status: "Inactive" });
    else await addOnRepository.update(entityId, { status: "Inactive" });
  } catch {
    // Record may already have been deleted/changed independently — skip rather than fail the whole rollback.
  }
}

async function restoreFields(entityType: SyncEntityType, entityId: string, fields: Record<string, unknown>): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fields is a dynamic snapshot captured generically across four different record shapes at commit time (see sync.ts snapshotFields)
    const patch = fields as any;
    if (entityType === "hotel") await hotelRepository.update(entityId, patch);
    else if (entityType === "transport") await transportRepository.update(entityId, patch);
    else if (entityType === "activity") await activityRepository.update(entityId, patch);
    else await addOnRepository.update(entityId, patch);
  } catch {
    // Same as above — best-effort per record.
  }
}
