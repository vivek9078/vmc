import { ExcelTable } from "./excelTable";
import type { AddOnRepository } from "../types";
import type { AddOnItem } from "@/types/domain";

const COLUMNS = [
  "id", "name", "description", "serviceType", "price", "currency", "vehicleType", "duration", "startTime",
  "distance", "schedule", "season", "supplierId", "relatedEntityType", "relatedEntityId",
  "dutyCode", "syncKey", "sourceImportBatchId", "status", "createdAt", "updatedAt",
];

function rowToRecord(row: string[]): AddOnItem {
  const [
    id, name, description, serviceType, price, currency, vehicleType, duration, startTime,
    distance, schedule, season, supplierId, relatedEntityType, relatedEntityId,
    dutyCode, syncKey, sourceImportBatchId, status, createdAt, updatedAt,
  ] = row;
  return {
    id, name, description: description || undefined, serviceType: serviceType || undefined,
    price: Number(price) || 0, currency: currency || undefined, vehicleType: vehicleType || undefined,
    duration: duration || undefined, startTime: startTime || undefined, distance: distance || undefined,
    schedule: schedule || undefined, season: season || undefined, supplierId: supplierId || undefined,
    relatedEntityType: (relatedEntityType as AddOnItem["relatedEntityType"]) || undefined,
    relatedEntityId: relatedEntityId || undefined,
    dutyCode: dutyCode || undefined, syncKey: syncKey || undefined, sourceImportBatchId: sourceImportBatchId || undefined,
    status: (status as AddOnItem["status"]) || "Active",
    createdAt, updatedAt,
  };
}

function recordToRow(r: AddOnItem): string[] {
  return [
    r.id, r.name, r.description ?? "", r.serviceType ?? "", String(r.price), r.currency ?? "", r.vehicleType ?? "",
    r.duration ?? "", r.startTime ?? "", r.distance ?? "", r.schedule ?? "", r.season ?? "", r.supplierId ?? "",
    r.relatedEntityType ?? "", r.relatedEntityId ?? "", r.dutyCode ?? "", r.syncKey ?? "", r.sourceImportBatchId ?? "",
    r.status, r.createdAt, r.updatedAt,
  ];
}

export class ExcelAddOnRepository implements AddOnRepository {
  private table = new ExcelTable<AddOnItem>("AddOns", COLUMNS, rowToRecord, recordToRow);

  async list(filters?: { search?: string; serviceType?: string }): Promise<AddOnItem[]> {
    let result = await this.table.list();
    if (filters?.serviceType) result = result.filter((a) => (a.serviceType ?? "").toLowerCase() === filters.serviceType!.toLowerCase());
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(s) || (a.serviceType ?? "").toLowerCase().includes(s));
    }
    return result;
  }

  async get(id: string): Promise<AddOnItem | null> {
    return this.table.get(id);
  }

  async findBySyncKey(syncKey: string): Promise<AddOnItem | null> {
    const all = await this.table.list();
    return all.find((a) => a.syncKey === syncKey) ?? null;
  }

  async create(data: Omit<AddOnItem, "id" | "createdAt" | "updatedAt">): Promise<AddOnItem> {
    const now = new Date().toISOString();
    const record: AddOnItem = { ...data, id: `adn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: now, updatedAt: now };
    return this.table.append(record);
  }

  async update(id: string, data: Partial<AddOnItem>): Promise<AddOnItem> {
    const existing = await this.table.get(id);
    if (!existing) throw new Error(`Add-on ${id} not found`);
    const updated: AddOnItem = { ...existing, ...data, updatedAt: new Date().toISOString() };
    return this.table.updateById(id, updated);
  }
}
