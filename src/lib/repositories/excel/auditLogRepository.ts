import { ExcelTable } from "./excelTable";
import type { AuditLogRepository } from "../types";
import type { AuditLogEntry } from "@/types/domain";

const COLUMNS = ["id", "userId", "userEmail", "action", "entityType", "entityId", "details", "ipAddress", "createdAt"];

function rowToRecord(row: string[]): AuditLogEntry {
  const [id, userId, userEmail, action, entityType, entityId, details, ipAddress, createdAt] = row;
  return {
    id, userId, userEmail,
    action: action as AuditLogEntry["action"],
    entityType,
    entityId: entityId || undefined,
    details: details || undefined,
    ipAddress: ipAddress || undefined,
    createdAt,
  };
}

function recordToRow(r: AuditLogEntry): string[] {
  return [r.id, r.userId, r.userEmail, r.action, r.entityType, r.entityId ?? "", r.details ?? "", r.ipAddress ?? "", r.createdAt];
}

export class ExcelAuditLogRepository implements AuditLogRepository {
  private table = new ExcelTable<AuditLogEntry>("AuditLogs", COLUMNS, rowToRecord, recordToRow);

  async list(filters?: { userId?: string; entityType?: string; limit?: number }): Promise<AuditLogEntry[]> {
    let all = await this.table.list();
    if (filters?.userId) all = all.filter((e) => e.userId === filters.userId);
    if (filters?.entityType) all = all.filter((e) => e.entityType === filters.entityType);
    const sorted = [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return filters?.limit ? sorted.slice(0, filters.limit) : sorted;
  }

  async getAll(): Promise<AuditLogEntry[]> {
    return this.list();
  }

  async get(id: string): Promise<AuditLogEntry | null> {
    return (await this.table.list()).find((e) => e.id === id) ?? null;
  }

  async find(predicate: (entry: AuditLogEntry) => boolean): Promise<AuditLogEntry[]> {
    return (await this.table.list()).filter(predicate);
  }

  async record(entry: Omit<AuditLogEntry, "id" | "createdAt">): Promise<AuditLogEntry> {
    const record: AuditLogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    return this.table.append(record);
  }
}
