import { ExcelTable } from "./excelTable";
import type { ImportBatchRepository } from "../types";
import type { ImportBatch, ImportEntityCounts, ImportRecord, ImportRowError } from "@/types/domain";

const ZERO_COUNTS: ImportEntityCounts = { hotel: 0, transport: 0, activity: 0, addon: 0 };

const BATCH_COLUMNS = [
  "id", "fileName", "uploadedByUserId", "uploadedByEmail", "uploadedAt", "totalRows",
  "created", "updated", "skipped", "errors", "status", "rolledBackAt", "rolledBackByUserId",
  "createdAt", "updatedAt",
];

function batchRowToRecord(row: string[]): ImportBatch {
  const [
    id, fileName, uploadedByUserId, uploadedByEmail, uploadedAt, totalRows,
    createdJson, updatedJson, skipped, errorsJson, status, rolledBackAt, rolledBackByUserId,
    createdAt, updatedAt,
  ] = row;
  let created: ImportEntityCounts = ZERO_COUNTS;
  let updated: ImportEntityCounts = ZERO_COUNTS;
  let errors: ImportRowError[] = [];
  try { created = createdJson ? JSON.parse(createdJson) : ZERO_COUNTS; } catch { /* ignore malformed cell */ }
  try { updated = updatedJson ? JSON.parse(updatedJson) : ZERO_COUNTS; } catch { /* ignore malformed cell */ }
  try { errors = errorsJson ? JSON.parse(errorsJson) : []; } catch { /* ignore malformed cell */ }
  return {
    id, fileName, uploadedByUserId, uploadedByEmail, uploadedAt,
    totalRows: Number(totalRows) || 0,
    created, updated, skipped: Number(skipped) || 0, errors,
    status: (status as ImportBatch["status"]) || "Completed",
    rolledBackAt: rolledBackAt || undefined, rolledBackByUserId: rolledBackByUserId || undefined,
    createdAt, updatedAt,
  };
}

function batchRecordToRow(r: ImportBatch): string[] {
  return [
    r.id, r.fileName, r.uploadedByUserId, r.uploadedByEmail, r.uploadedAt, String(r.totalRows),
    JSON.stringify(r.created), JSON.stringify(r.updated), String(r.skipped), JSON.stringify(r.errors),
    r.status, r.rolledBackAt ?? "", r.rolledBackByUserId ?? "",
    r.createdAt, r.updatedAt,
  ];
}

const RECORD_COLUMNS = ["id", "batchId", "entityType", "entityId", "action", "rowNumber", "previousValue", "createdAt"];

function recordRowToRecord(row: string[]): ImportRecord {
  const [id, batchId, entityType, entityId, action, rowNumber, previousValue, createdAt] = row;
  return {
    id, batchId,
    entityType: entityType as ImportRecord["entityType"],
    entityId, action: action as ImportRecord["action"],
    rowNumber: Number(rowNumber) || 0,
    previousValue: previousValue || undefined,
    createdAt,
  };
}

function recordRecordToRow(r: ImportRecord): string[] {
  return [r.id, r.batchId, r.entityType, r.entityId, r.action, String(r.rowNumber), r.previousValue ?? "", r.createdAt];
}

export class ExcelImportBatchRepository implements ImportBatchRepository {
  private batches = new ExcelTable<ImportBatch>("ImportBatches", BATCH_COLUMNS, batchRowToRecord, batchRecordToRow);
  private records = new ExcelTable<ImportRecord>("ImportRecords", RECORD_COLUMNS, recordRowToRecord, recordRecordToRow);

  async list(): Promise<ImportBatch[]> {
    const all = await this.batches.list();
    return all.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  async get(id: string): Promise<ImportBatch | null> {
    return this.batches.get(id);
  }

  async create(data: Omit<ImportBatch, "id" | "createdAt" | "updatedAt">): Promise<ImportBatch> {
    const now = new Date().toISOString();
    const record: ImportBatch = { ...data, id: `imp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: now, updatedAt: now };
    return this.batches.append(record);
  }

  async update(id: string, data: Partial<ImportBatch>): Promise<ImportBatch> {
    const existing = await this.batches.get(id);
    if (!existing) throw new Error(`Import batch ${id} not found`);
    const updated: ImportBatch = { ...existing, ...data, updatedAt: new Date().toISOString() };
    return this.batches.updateById(id, updated);
  }

  async listRecords(batchId: string): Promise<ImportRecord[]> {
    const all = await this.records.list();
    return all.filter((r) => r.batchId === batchId);
  }

  async addRecord(data: Omit<ImportRecord, "id" | "createdAt">): Promise<ImportRecord> {
    const now = new Date().toISOString();
    const record: ImportRecord = { ...data, id: `imr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: now };
    return this.records.append(record);
  }
}
