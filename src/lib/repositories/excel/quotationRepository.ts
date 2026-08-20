import { ExcelTable } from "./excelTable";
import type { QuotationRepository } from "../types";
import type { Quotation } from "@/types/domain";

const COLUMNS = [
  "id", "queryId", "packageName", "status",
  "hotelLinesJson", "transportLinesJson", "activityLinesJson",
  "markupPercent", "discountPercent", "gstPercent",
  "internalComments", "createdAt", "updatedAt",
];

function safeParse<T>(json: string, fallback: T): T {
  try {
    return json ? (JSON.parse(json) as T) : fallback;
  } catch {
    return fallback;
  }
}

function rowToRecord(row: string[]): Quotation {
  const [
    id, queryId, packageName, status,
    hotelLinesJson, transportLinesJson, activityLinesJson,
    markupPercent, discountPercent, gstPercent,
    internalComments, createdAt, updatedAt,
  ] = row;

  return {
    id, queryId, packageName,
    status: (status as Quotation["status"]) || "Draft",
    hotelLines: safeParse(hotelLinesJson, []),
    transportLines: safeParse(transportLinesJson, []),
    activityLines: safeParse(activityLinesJson, []),
    markupPercent: Number(markupPercent) || 0,
    discountPercent: Number(discountPercent) || 0,
    gstPercent: Number(gstPercent) || 0,
    internalComments: internalComments || undefined,
    createdAt, updatedAt,
  };
}

function recordToRow(r: Quotation): string[] {
  return [
    r.id, r.queryId, r.packageName, r.status,
    JSON.stringify(r.hotelLines), JSON.stringify(r.transportLines), JSON.stringify(r.activityLines),
    String(r.markupPercent), String(r.discountPercent), String(r.gstPercent),
    r.internalComments ?? "", r.createdAt, r.updatedAt,
  ];
}

export class ExcelQuotationRepository implements QuotationRepository {
  private table = new ExcelTable<Quotation>("Quotations", COLUMNS, rowToRecord, recordToRow);

  private sequenceFrom(all: Quotation[], queryId: string): number {
    const prefix = `${queryId}-Q`;
    const numbers = all
      .map((q) => q.id)
      .filter((id) => id.startsWith(prefix))
      .map((id) => Number(id.slice(prefix.length)) || 0);
    return (numbers.length ? Math.max(...numbers) : 0) + 1;
  }

  async list(): Promise<Quotation[]> {
    const all = await this.table.list();
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listForQuery(queryId: string): Promise<Quotation[]> {
    const all = await this.table.list();
    return all.filter((q) => q.queryId === queryId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<Quotation | null> {
    return this.table.get(id);
  }

  async create(queryId: string, packageName: string): Promise<Quotation> {
    const now = new Date().toISOString();
    return this.table.appendComputed((existing) => ({
      id: `${queryId}-Q${this.sequenceFrom(existing, queryId)}`,
      queryId, packageName, status: "Draft",
      hotelLines: [], transportLines: [], activityLines: [],
      markupPercent: 15, discountPercent: 0, gstPercent: 10,
      createdAt: now, updatedAt: now,
    }));
  }

  async update(id: string, data: Partial<Quotation>): Promise<Quotation> {
    const existing = await this.table.get(id);
    if (!existing) throw new Error(`Quotation ${id} not found`);
    const updated: Quotation = { ...existing, ...data, updatedAt: new Date().toISOString() };
    return this.table.updateById(id, updated);
  }

  async duplicate(id: string): Promise<Quotation> {
    const source = await this.table.get(id);
    if (!source) throw new Error(`Quotation ${id} not found`);
    const now = new Date().toISOString();
    return this.table.appendComputed((existing) => ({
      ...JSON.parse(JSON.stringify(source)),
      id: `${source.queryId}-Q${this.sequenceFrom(existing, source.queryId)}`,
      status: "Draft",
      createdAt: now, updatedAt: now,
    }));
  }
}
