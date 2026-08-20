import { ExcelTable } from "./excelTable";
import type { HotelRepository } from "../types";
import type { Hotel } from "@/types/domain";

const COLUMNS = [
  "id", "name", "city", "starRating", "roomTypes", "mealPlans",
  "supplierId", "supplierContact", "supplierCost", "sellingCost",
  "cancellationPolicy", "checkInTime", "checkOutTime", "availableFrom", "availableTo", "images",
  "internalNotes", "status", "linkedRateItemId", "linkedRateColumnId",
  "area", "roomType", "mealPlan", "season", "dutyCode", "syncKey", "sourceImportBatchId",
  "createdAt", "updatedAt",
];

function rowToRecord(row: string[]): Hotel {
  const [
    id, name, city, starRating, roomTypesCsv, mealPlansCsv,
    supplierId, supplierContact, supplierCost, sellingCost,
    cancellationPolicy, checkInTime, checkOutTime, availableFrom, availableTo, imagesCsv,
    internalNotes, status, linkedRateItemId, linkedRateColumnId,
    area, roomType, mealPlan, season, dutyCode, syncKey, sourceImportBatchId,
    createdAt, updatedAt,
  ] = row;

  return {
    id, name, city,
    starRating: Number(starRating) || 0,
    roomTypes: roomTypesCsv ? roomTypesCsv.split(",").map((s) => s.trim()).filter(Boolean) : [],
    mealPlans: mealPlansCsv ? mealPlansCsv.split(",").map((s) => s.trim()).filter(Boolean) : [],
    supplierId,
    supplierContact: supplierContact || undefined,
    supplierCost: Number(supplierCost) || 0,
    sellingCost: Number(sellingCost) || 0,
    cancellationPolicy: cancellationPolicy || undefined,
    checkInTime: checkInTime || undefined,
    checkOutTime: checkOutTime || undefined,
    availableFrom: availableFrom || undefined,
    availableTo: availableTo || undefined,
    images: imagesCsv ? imagesCsv.split(",").map((s) => s.trim()).filter(Boolean) : [],
    internalNotes: internalNotes || undefined,
    status: (status as Hotel["status"]) || "Active",
    linkedRateItemId: linkedRateItemId || undefined,
    linkedRateColumnId: linkedRateColumnId || undefined,
    area: area || undefined, roomType: roomType || undefined, mealPlan: mealPlan || undefined, season: season || undefined,
    dutyCode: dutyCode || undefined, syncKey: syncKey || undefined, sourceImportBatchId: sourceImportBatchId || undefined,
    createdAt, updatedAt,
  };
}

function recordToRow(r: Hotel): string[] {
  return [
    r.id, r.name, r.city, String(r.starRating), r.roomTypes.join(", "), r.mealPlans.join(", "),
    r.supplierId, r.supplierContact ?? "", String(r.supplierCost), String(r.sellingCost),
    r.cancellationPolicy ?? "", r.checkInTime ?? "", r.checkOutTime ?? "", r.availableFrom ?? "", r.availableTo ?? "", r.images.join(", "),
    r.internalNotes ?? "", r.status, r.linkedRateItemId ?? "", r.linkedRateColumnId ?? "",
    r.area ?? "", r.roomType ?? "", r.mealPlan ?? "", r.season ?? "", r.dutyCode ?? "", r.syncKey ?? "", r.sourceImportBatchId ?? "",
    r.createdAt, r.updatedAt,
  ];
}

export class ExcelHotelRepository implements HotelRepository {
  private table = new ExcelTable<Hotel>("Hotels", COLUMNS, rowToRecord, recordToRow);

  async list(filters?: { city?: string; search?: string }): Promise<Hotel[]> {
    let result = await this.table.list();
    if (filters?.city) result = result.filter((h) => h.city.toLowerCase() === filters.city!.toLowerCase());
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter((h) => h.name.toLowerCase().includes(s) || h.city.toLowerCase().includes(s));
    }
    return result;
  }

  async get(id: string): Promise<Hotel | null> {
    return this.table.get(id);
  }

  async findPossibleDuplicates(name: string, city: string): Promise<Hotel[]> {
    const all = await this.table.list();
    const n = name.trim().toLowerCase();
    return all.filter((h) => h.city.toLowerCase() === city.toLowerCase() && h.name.trim().toLowerCase() === n);
  }

  async findBySyncKey(syncKey: string): Promise<Hotel | null> {
    const all = await this.table.list();
    return all.find((h) => h.syncKey === syncKey) ?? null;
  }

  async create(data: Omit<Hotel, "id" | "createdAt" | "updatedAt">): Promise<Hotel> {
    const now = new Date().toISOString();
    const record: Hotel = { ...data, id: `htl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: now, updatedAt: now };
    return this.table.append(record);
  }

  async update(id: string, data: Partial<Hotel>): Promise<Hotel> {
    const existing = await this.table.get(id);
    if (!existing) throw new Error(`Hotel ${id} not found`);
    const updated: Hotel = { ...existing, ...data, updatedAt: new Date().toISOString() };
    return this.table.updateById(id, updated);
  }
}
