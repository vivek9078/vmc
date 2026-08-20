import { ExcelTable } from "./excelTable";
import type { TransportRepository } from "../types";
import type { TransportItem } from "@/types/domain";

const COLUMNS = [
  "id", "vehicleType", "capacity", "supplierId", "pickup", "drop", "cost", "selling", "remarks", "status",
  "availableFrom", "availableTo", "linkedRateItemId", "linkedRateColumnId",
  "service", "distance", "startTime", "daySchedule", "season", "dutyCode", "syncKey", "sourceImportBatchId",
  "createdAt", "updatedAt",
];

function rowToRecord(row: string[]): TransportItem {
  const [
    id, vehicleType, capacity, supplierId, pickup, drop, cost, selling, remarks, status,
    availableFrom, availableTo, linkedRateItemId, linkedRateColumnId,
    service, distance, startTime, daySchedule, season, dutyCode, syncKey, sourceImportBatchId,
    createdAt, updatedAt,
  ] = row;
  return {
    id, vehicleType, capacity: Number(capacity) || 0, supplierId, pickup, drop,
    cost: Number(cost) || 0, selling: Number(selling) || 0, remarks: remarks || undefined,
    status: (status as TransportItem["status"]) || "Active",
    availableFrom: availableFrom || undefined, availableTo: availableTo || undefined,
    linkedRateItemId: linkedRateItemId || undefined, linkedRateColumnId: linkedRateColumnId || undefined,
    service: service || undefined, distance: distance || undefined, startTime: startTime || undefined,
    daySchedule: daySchedule || undefined, season: season || undefined, dutyCode: dutyCode || undefined,
    syncKey: syncKey || undefined, sourceImportBatchId: sourceImportBatchId || undefined,
    createdAt, updatedAt,
  };
}

function recordToRow(r: TransportItem): string[] {
  return [
    r.id, r.vehicleType, String(r.capacity), r.supplierId, r.pickup, r.drop, String(r.cost), String(r.selling), r.remarks ?? "", r.status,
    r.availableFrom ?? "", r.availableTo ?? "", r.linkedRateItemId ?? "", r.linkedRateColumnId ?? "",
    r.service ?? "", r.distance ?? "", r.startTime ?? "", r.daySchedule ?? "", r.season ?? "", r.dutyCode ?? "", r.syncKey ?? "", r.sourceImportBatchId ?? "",
    r.createdAt, r.updatedAt,
  ];
}

export class ExcelTransportRepository implements TransportRepository {
  private table = new ExcelTable<TransportItem>("Transport", COLUMNS, rowToRecord, recordToRow);

  async list(filters?: { search?: string }): Promise<TransportItem[]> {
    let result = await this.table.list();
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter((t) =>
        t.vehicleType.toLowerCase().includes(s) ||
        t.pickup.toLowerCase().includes(s) ||
        t.drop.toLowerCase().includes(s) ||
        (t.service ?? "").toLowerCase().includes(s)
      );
    }
    return result;
  }

  async get(id: string): Promise<TransportItem | null> {
    return this.table.get(id);
  }

  /** Finds a transport row previously created by CSV Sync with the same composite dedup key (see src/lib/csvSync). */
  async findBySyncKey(syncKey: string): Promise<TransportItem | null> {
    const all = await this.table.list();
    return all.find((t) => t.syncKey === syncKey) ?? null;
  }

  async findByDutyCode(dutyCode: string, vehicleType: string): Promise<TransportItem | null> {
    const all = await this.table.list();
    return all.find((t) => t.dutyCode === dutyCode && t.vehicleType === vehicleType) ?? null;
  }

  async create(data: Omit<TransportItem, "id" | "createdAt" | "updatedAt">): Promise<TransportItem> {
    const now = new Date().toISOString();
    const record: TransportItem = { ...data, id: `trn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: now, updatedAt: now };
    return this.table.append(record);
  }

  async update(id: string, data: Partial<TransportItem>): Promise<TransportItem> {
    const existing = await this.table.get(id);
    if (!existing) throw new Error(`Transport item ${id} not found`);
    const updated: TransportItem = { ...existing, ...data, updatedAt: new Date().toISOString() };
    return this.table.updateById(id, updated);
  }
}
