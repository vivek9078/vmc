import { ExcelTable } from "./excelTable";
import type { InvoiceRepository } from "../types";
import type { Invoice } from "@/types/domain";

const COLUMNS = ["id", "bookingId", "invoiceNumber", "amount", "status", "issuedAt", "dueAt", "notes", "createdAt", "updatedAt"];

function rowToRecord(row: string[]): Invoice {
  const [id, bookingId, invoiceNumber, amount, status, issuedAt, dueAt, notes, createdAt, updatedAt] = row;
  return {
    id, bookingId, invoiceNumber,
    amount: Number(amount) || 0,
    status: (status as Invoice["status"]) || "Draft",
    issuedAt: issuedAt || undefined,
    dueAt: dueAt || undefined,
    notes: notes || undefined,
    createdAt, updatedAt,
  };
}

function recordToRow(r: Invoice): string[] {
  return [r.id, r.bookingId, r.invoiceNumber, String(r.amount), r.status, r.issuedAt ?? "", r.dueAt ?? "", r.notes ?? "", r.createdAt, r.updatedAt];
}

export class ExcelInvoiceRepository implements InvoiceRepository {
  private table = new ExcelTable<Invoice>("Invoices", COLUMNS, rowToRecord, recordToRow);

  async list(): Promise<Invoice[]> {
    return this.table.list();
  }

  async getAll(): Promise<Invoice[]> {
    return this.list();
  }

  async get(id: string): Promise<Invoice | null> {
    return this.table.get(id);
  }

  async listByBooking(bookingId: string): Promise<Invoice[]> {
    return (await this.list()).filter((i) => i.bookingId === bookingId);
  }

  async find(predicate: (invoice: Invoice) => boolean): Promise<Invoice[]> {
    return (await this.list()).filter(predicate);
  }

  async create(data: Omit<Invoice, "id" | "createdAt" | "updatedAt">): Promise<Invoice> {
    const now = new Date().toISOString();
    const record: Invoice = { ...data, id: `inv_${Date.now()}`, createdAt: now, updatedAt: now };
    return this.table.append(record);
  }

  async update(id: string, data: Partial<Invoice>): Promise<Invoice> {
    const existing = await this.table.get(id);
    if (!existing) throw new Error(`Invoice ${id} not found`);
    const updated: Invoice = { ...existing, ...data, updatedAt: new Date().toISOString() };
    return this.table.updateById(id, updated);
  }

  async delete(id: string): Promise<void> {
    await this.table.deleteById(id);
  }
}
