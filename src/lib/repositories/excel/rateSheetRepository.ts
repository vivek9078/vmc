import { ExcelTable } from "./excelTable";
import type { RateSheetRepository } from "../types";
import type { RateSheetCategory, RateSheetItem } from "@/types/domain";

// ---- Categories ----

const CATEGORY_COLUMNS = ["id", "name", "destination", "serviceMode", "priceColumnsJson", "createdAt", "updatedAt"];

function safeParse<T>(json: string, fallback: T): T {
  try {
    return json ? (JSON.parse(json) as T) : fallback;
  } catch {
    return fallback;
  }
}

function categoryRowToRecord(row: string[]): RateSheetCategory {
  const [id, name, destination, serviceMode, priceColumnsJson, createdAt, updatedAt] = row;
  return {
    id, name, destination,
    serviceMode: (serviceMode as RateSheetCategory["serviceMode"]) || "Other",
    priceColumns: safeParse(priceColumnsJson, []),
    createdAt, updatedAt,
  };
}

function categoryRecordToRow(r: RateSheetCategory): string[] {
  return [r.id, r.name, r.destination, r.serviceMode, JSON.stringify(r.priceColumns), r.createdAt, r.updatedAt];
}

// ---- Items ----

const ITEM_COLUMNS = [
  "id", "categoryId", "name", "service", "description",
  "openTime", "closeTime", "durationMinutes", "slots",
  "distance", "startTime", "daySchedule",
  "seasonsJson", "status", "createdAt", "updatedAt",
];

function itemRowToRecord(row: string[]): RateSheetItem {
  const [
    id, categoryId, name, service, description,
    openTime, closeTime, durationMinutes, slots,
    distance, startTime, daySchedule,
    seasonsJson, status, createdAt, updatedAt,
  ] = row;
  return {
    id, categoryId, name, service,
    description: description || undefined,
    openTime: openTime || undefined,
    closeTime: closeTime || undefined,
    durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
    slots: slots || undefined,
    distance: distance || undefined,
    startTime: startTime || undefined,
    daySchedule: daySchedule || undefined,
    seasons: safeParse(seasonsJson, []),
    status: (status as RateSheetItem["status"]) || "Active",
    createdAt, updatedAt,
  };
}

function itemRecordToRow(r: RateSheetItem): string[] {
  return [
    r.id, r.categoryId, r.name, r.service, r.description ?? "",
    r.openTime ?? "", r.closeTime ?? "", r.durationMinutes !== undefined ? String(r.durationMinutes) : "", r.slots ?? "",
    r.distance ?? "", r.startTime ?? "", r.daySchedule ?? "",
    JSON.stringify(r.seasons), r.status, r.createdAt, r.updatedAt,
  ];
}

export class ExcelRateSheetRepository implements RateSheetRepository {
  private categories = new ExcelTable<RateSheetCategory>("RateSheetCategories", CATEGORY_COLUMNS, categoryRowToRecord, categoryRecordToRow);
  private items = new ExcelTable<RateSheetItem>("RateSheetItems", ITEM_COLUMNS, itemRowToRecord, itemRecordToRow);

  async listCategories(): Promise<RateSheetCategory[]> {
    return this.categories.list();
  }

  async getCategory(id: string): Promise<RateSheetCategory | null> {
    return this.categories.get(id);
  }

  async createCategory(data: Omit<RateSheetCategory, "id" | "createdAt" | "updatedAt">): Promise<RateSheetCategory> {
    const now = new Date().toISOString();
    const record: RateSheetCategory = { ...data, id: `cat_${Date.now()}`, createdAt: now, updatedAt: now };
    return this.categories.append(record);
  }

  async upsertCategoryByName(data: Omit<RateSheetCategory, "id" | "createdAt" | "updatedAt">): Promise<RateSheetCategory> {
    const all = await this.categories.list();
    const existing = all.find((c) => c.name === data.name);
    if (existing) {
      const updated: RateSheetCategory = { ...existing, ...data, updatedAt: new Date().toISOString() };
      return this.categories.updateById(existing.id, updated);
    }
    return this.createCategory(data);
  }

  async list(categoryId: string): Promise<RateSheetItem[]> {
    const all = await this.items.list();
    return all.filter((i) => i.categoryId === categoryId);
  }

  async create(data: Omit<RateSheetItem, "id" | "createdAt" | "updatedAt">): Promise<RateSheetItem> {
    const now = new Date().toISOString();
    const record: RateSheetItem = { ...data, id: `rsi_${Date.now()}`, createdAt: now, updatedAt: now };
    return this.items.append(record);
  }

  async update(id: string, data: Partial<RateSheetItem>): Promise<RateSheetItem> {
    const existing = await this.items.get(id);
    if (!existing) throw new Error(`Rate sheet item ${id} not found`);
    const updated: RateSheetItem = { ...existing, ...data, updatedAt: new Date().toISOString() };
    return this.items.updateById(id, updated);
  }

  async upsertByName(data: Omit<RateSheetItem, "id" | "createdAt" | "updatedAt">): Promise<{ item: RateSheetItem; created: boolean }> {
    const all = await this.items.list();
    const existing = all.find((i) => i.categoryId === data.categoryId && i.name === data.name);
    if (existing) {
      const updated: RateSheetItem = { ...existing, ...data, updatedAt: new Date().toISOString() };
      return { item: await this.items.updateById(existing.id, updated), created: false };
    }
    return { item: await this.create(data), created: true };
  }
}
