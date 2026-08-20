import { ExcelTable } from "./excelTable";
import type { SupplierRepository } from "../types";
import type { Supplier } from "@/types/domain";

const COLUMNS = ["id", "name", "company", "phone", "email", "country", "paymentTerms", "gst", "bankDetails", "internalNotes", "createdAt", "updatedAt"];

function rowToRecord(row: string[]): Supplier {
  const [id, name, company, phone, email, country, paymentTerms, gst, bankDetails, internalNotes, createdAt, updatedAt] = row;
  return {
    id, name, company, phone, email, country,
    paymentTerms: paymentTerms || undefined, gst: gst || undefined,
    bankDetails: bankDetails || undefined, internalNotes: internalNotes || undefined,
    createdAt, updatedAt,
  };
}

function recordToRow(r: Supplier): string[] {
  return [r.id, r.name, r.company, r.phone, r.email, r.country, r.paymentTerms ?? "", r.gst ?? "", r.bankDetails ?? "", r.internalNotes ?? "", r.createdAt, r.updatedAt];
}

export class ExcelSupplierRepository implements SupplierRepository {
  private table = new ExcelTable<Supplier>("Suppliers", COLUMNS, rowToRecord, recordToRow);

  async list(filters?: { search?: string }): Promise<Supplier[]> {
    let result = await this.table.list();
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter((sup) => sup.name.toLowerCase().includes(s) || sup.company.toLowerCase().includes(s));
    }
    return result;
  }

  async create(data: Omit<Supplier, "id" | "createdAt" | "updatedAt">): Promise<Supplier> {
    const now = new Date().toISOString();
    const record: Supplier = { ...data, id: `sup_${Date.now()}`, createdAt: now, updatedAt: now };
    return this.table.append(record);
  }

  async update(id: string, data: Partial<Supplier>): Promise<Supplier> {
    const existing = await this.table.get(id);
    if (!existing) throw new Error(`Supplier ${id} not found`);
    const updated: Supplier = { ...existing, ...data, updatedAt: new Date().toISOString() };
    return this.table.updateById(id, updated);
  }
}
