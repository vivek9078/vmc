import { ExcelTable } from "./excelTable";
import type { ActivityRepository } from "../types";
import type { ActivityItem } from "@/types/domain";

const COLUMNS = [
  "id", "name", "city", "supplierId", "duration", "operatingDays", "cost", "selling", "remarks",
  "availableFrom", "availableTo", "status", "linkedRateItemId", "linkedRateColumnId",
  "service", "startTime", "season", "dutyCode", "syncKey", "sourceImportBatchId",
  "createdAt", "updatedAt",
];

function rowToRecord(row: string[]): ActivityItem {
  const [
    id, name, city, supplierId, duration, operatingDaysCsv, cost, selling, remarks,
    availableFrom, availableTo, status, linkedRateItemId, linkedRateColumnId,
    service, startTime, season, dutyCode, syncKey, sourceImportBatchId,
    createdAt, updatedAt,
  ] = row;
  return {
    id, name, city, supplierId, duration,
    operatingDays: operatingDaysCsv ? operatingDaysCsv.split(",").map((d) => d.trim()).filter(Boolean) : [],
    cost: Number(cost) || 0, selling: Number(selling) || 0, remarks: remarks || undefined,
    availableFrom: availableFrom || undefined, availableTo: availableTo || undefined,
    status: (status as ActivityItem["status"]) || "Active",
    linkedRateItemId: linkedRateItemId || undefined, linkedRateColumnId: linkedRateColumnId || undefined,
    service: service || undefined, startTime: startTime || undefined, season: season || undefined,
    dutyCode: dutyCode || undefined, syncKey: syncKey || undefined, sourceImportBatchId: sourceImportBatchId || undefined,
    createdAt, updatedAt,
  };
}

function recordToRow(r: ActivityItem): string[] {
  return [
    r.id, r.name, r.city, r.supplierId, r.duration, r.operatingDays.join(", "), String(r.cost), String(r.selling), r.remarks ?? "",
    r.availableFrom ?? "", r.availableTo ?? "", r.status, r.linkedRateItemId ?? "", r.linkedRateColumnId ?? "",
    r.service ?? "", r.startTime ?? "", r.season ?? "", r.dutyCode ?? "", r.syncKey ?? "", r.sourceImportBatchId ?? "",
    r.createdAt, r.updatedAt,
  ];
}

export class ExcelActivityRepository implements ActivityRepository {
  private table = new ExcelTable<ActivityItem>("Activities", COLUMNS, rowToRecord, recordToRow);

  async list(filters?: { city?: string; search?: string }): Promise<ActivityItem[]> {
    let result = await this.table.list();
    if (filters?.city) result = result.filter((a) => a.city.toLowerCase() === filters.city!.toLowerCase());
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(s));
    }
    return result;
  }

  async get(id: string): Promise<ActivityItem | null> {
    return this.table.get(id);
  }

  async findBySyncKey(syncKey: string): Promise<ActivityItem | null> {
    const all = await this.table.list();
    return all.find((a) => a.syncKey === syncKey) ?? null;
  }

  async create(data: Omit<ActivityItem, "id" | "createdAt" | "updatedAt">): Promise<ActivityItem> {
    const now = new Date().toISOString();
    const record: ActivityItem = { ...data, id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: now, updatedAt: now };
    return this.table.append(record);
  }

  async update(id: string, data: Partial<ActivityItem>): Promise<ActivityItem> {
    const existing = await this.table.get(id);
    if (!existing) throw new Error(`Activity ${id} not found`);
    const updated: ActivityItem = { ...existing, ...data, updatedAt: new Date().toISOString() };
    return this.table.updateById(id, updated);
  }
}
