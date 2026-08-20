"use server";

import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { importBatchRepository } from "@/lib/repositories";
import {
  parseCsvFilesForSync,
  planRows,
  commitPlanItem,
  tallyPlan,
  zeroCounts,
  SupplierCache,
  rollbackImportBatch,
  savePendingImport,
  getPendingImport,
  clearPendingImport,
  applyExpectedType,
  checkExpectedType,
  type PlanItem,
} from "@/lib/csvSync";
import type { ImportBatch, ImportEntityCounts, ImportRowError, SyncEntityType } from "@/types/domain";

const MAX_IMPORT_BYTES = 10 * 1024 * 1024; // 10MB per file, matches the Rate Sheet importer's limit

export interface PreviewResult {
  ok: boolean;
  error?: string;
  pendingId?: string;
  fileNames: string[];
  totalRows: number;
  created: ImportEntityCounts;
  updated: ImportEntityCounts;
  skipped: number;
  errors: ImportRowError[];
  /** A capped sample of what will change, grouped for the preview table. */
  sample: { entityType: SyncEntityType; action: "create" | "update"; label: string; rowNumber: number }[];
}

const EMPTY_PREVIEW: Omit<PreviewResult, "ok" | "error"> = {
  fileNames: [], totalRows: 0, created: zeroCounts(), updated: zeroCounts(), skipped: 0, errors: [], sample: [],
};

/** Step 1: parses and plans the upload without writing anything, so the admin can review before committing (spec section 14). */
export async function previewCsvSyncAction(formData: FormData): Promise<PreviewResult> {
  const auth = await requireAuth("inventory.manage_rates");

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return { ok: false, error: "No file was uploaded.", ...EMPTY_PREVIEW };
  }
  for (const file of files) {
    if (!/\.csv$/i.test(file.name)) {
      return { ok: false, error: `"${file.name}" is not a .csv file.`, ...EMPTY_PREVIEW };
    }
    if (file.size > MAX_IMPORT_BYTES) {
      return { ok: false, error: `"${file.name}" is too large (max 10MB).`, ...EMPTY_PREVIEW };
    }
  }

  let textFiles: { name: string; text: string }[];
  try {
    textFiles = await Promise.all(files.map(async (file) => ({ name: file.name, text: await file.text() })));
  } catch {
    return { ok: false, error: "Could not read those files — are they valid CSV files?", ...EMPTY_PREVIEW };
  }

  const { results, totalRows } = parseCsvFilesForSync(textFiles);
  if (totalRows === 0) {
    const readIssues = results.flatMap((r) => r.issues.map((i) => ({ rowNumber: i.rowNumber, message: `"${r.fileName}": ${i.message}` })));
    return { ok: false, error: "No data rows were found in those files.", ...EMPTY_PREVIEW, errors: readIssues };
  }

  const allRows = results.flatMap((r) => r.rows);
  const parseIssues = results.flatMap((r) => r.issues.map((i) => ({ rowNumber: i.rowNumber, message: `"${r.fileName}": ${i.message}` })));

  const expectedTypeRaw = formData.get("expectedType");
  const expectedType = typeof expectedTypeRaw === "string" && expectedTypeRaw ? (expectedTypeRaw as SyncEntityType) : undefined;

  if (expectedType) {
    const check = checkExpectedType(allRows, expectedType);
    if (!check.ok) {
      return { ok: false, error: check.error, ...EMPTY_PREVIEW };
    }
  }

  const scopedRows = expectedType ? applyExpectedType(allRows, expectedType) : allRows;

  const plan = await planRows(scopedRows);
  const { created, updated } = tallyPlan(plan.items);
  const errors: ImportRowError[] = [
    ...parseIssues,
    ...plan.skipped.map((s) => ({ rowNumber: s.rowNumber, message: s.message })),
  ];

  const pendingId = savePendingImport(textFiles, auth.userId, auth.email, expectedType);

  const sample = plan.items.slice(0, 60).map((item) => ({
    entityType: item.entityType, action: item.action, label: item.label, rowNumber: item.rowNumber,
  }));

  return {
    ok: true,
    pendingId,
    fileNames: textFiles.map((f) => f.name),
    totalRows,
    created, updated,
    skipped: plan.skipped.length,
    errors,
    sample,
  };
}

export interface ConfirmResult {
  ok: boolean;
  error?: string;
  batch?: ImportBatch;
}

/** Step 2: re-parses the pending upload (so it reflects any DB changes since preview) and actually writes every create/update, recording an ImportBatch + per-record ImportRecords for rollback (spec sections 16, 21). */
export async function confirmCsvSyncAction(pendingId: string): Promise<ConfirmResult> {
  const auth = await requireAuth("inventory.manage_rates");

  const pending = getPendingImport(pendingId);
  if (!pending) {
    return { ok: false, error: "This preview has expired — please re-upload the file and try again." };
  }

  const { results, totalRows } = parseCsvFilesForSync(pending.files);
  const allRows = results.flatMap((r) => r.rows);
  const parseIssues: ImportRowError[] = results.flatMap((r) => r.issues.map((i) => ({ rowNumber: i.rowNumber, message: `"${r.fileName}": ${i.message}` })));

  if (pending.expectedType) {
    const check = checkExpectedType(allRows, pending.expectedType);
    if (!check.ok) {
      clearPendingImport(pendingId);
      return { ok: false, error: check.error };
    }
  }

  const scopedRows = pending.expectedType ? applyExpectedType(allRows, pending.expectedType) : allRows;
  const plan = await planRows(scopedRows);
  const supplierCache = new SupplierCache();

  const batch = await importBatchRepository.create({
    fileName: pending.files.map((f) => f.name).join(", "),
    uploadedByUserId: pending.uploadedByUserId,
    uploadedByEmail: pending.uploadedByEmail,
    uploadedAt: new Date().toISOString(),
    totalRows,
    created: zeroCounts(),
    updated: zeroCounts(),
    skipped: plan.skipped.length,
    errors: [...parseIssues, ...plan.skipped.map((s) => ({ rowNumber: s.rowNumber, message: s.message }))],
    status: "Completed",
  });

  const created = zeroCounts();
  const updated = zeroCounts();

  for (const item of plan.items as PlanItem[]) {
    try {
      const outcome = await commitPlanItem(item, supplierCache);
      await importBatchRepository.addRecord({
        batchId: batch.id,
        entityType: item.entityType,
        entityId: outcome.entityId,
        action: outcome.action === "create" ? "created" : "updated",
        rowNumber: item.rowNumber,
        previousValue: outcome.previousValue ? JSON.stringify(outcome.previousValue) : undefined,
      });
      if (outcome.action === "create") created[item.entityType] += 1;
      else updated[item.entityType] += 1;
    } catch (err) {
      batch.errors.push({ rowNumber: item.rowNumber, message: err instanceof Error ? err.message : "Failed to save this row." });
    }
  }

  const finalBatch = await importBatchRepository.update(batch.id, { created, updated, errors: batch.errors });

  clearPendingImport(pendingId);

  await logAudit({
    userId: auth.userId, userEmail: auth.email, action: "create",
    entityType: "ImportBatch", entityId: finalBatch.id,
    details: `CSV Sync: ${finalBatch.fileName} — ${created.hotel + created.transport + created.activity + created.addon} created, ${updated.hotel + updated.transport + updated.activity + updated.addon} updated.`,
  });

  return { ok: true, batch: finalBatch };
}

export async function listImportHistoryAction(): Promise<ImportBatch[]> {
  await requireAuth("inventory.manage_rates");
  return importBatchRepository.list();
}

export interface RollbackResult {
  ok: boolean;
  error?: string;
  restored?: number;
  deactivated?: number;
}

export async function rollbackImportAction(batchId: string): Promise<RollbackResult> {
  const auth = await requireAuth("inventory.manage_rates");
  try {
    const { restored, deactivated } = await rollbackImportBatch(batchId, auth.userId);
    await logAudit({
      userId: auth.userId, userEmail: auth.email, action: "update",
      entityType: "ImportBatch", entityId: batchId,
      details: `Rolled back CSV Sync import — ${deactivated} record(s) deactivated, ${restored} restored.`,
    });
    return { ok: true, restored, deactivated };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not roll back this import." };
  }
}
