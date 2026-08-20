import { ExcelTable } from "./excelTable";
import type { CustomerRepository } from "../types";
import type { Customer } from "@/types/domain";

const COLUMNS = ["id", "name", "email", "phone", "notes", "createdAt", "updatedAt"];

function rowToRecord(row: string[]): Customer {
  const [id, name, email, phone, notes, createdAt, updatedAt] = row;
  return { id, name, email, phone: phone || undefined, notes: notes || undefined, createdAt, updatedAt };
}

function recordToRow(r: Customer): string[] {
  return [r.id, r.name, r.email, r.phone ?? "", r.notes ?? "", r.createdAt, r.updatedAt];
}

export class ExcelCustomerRepository implements CustomerRepository {
  private table = new ExcelTable<Customer>("Customers", COLUMNS, rowToRecord, recordToRow);

  async list(): Promise<Customer[]> {
    return this.table.list();
  }

  async getAll(): Promise<Customer[]> {
    return this.list();
  }

  async get(id: string): Promise<Customer | null> {
    return this.table.get(id);
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const lower = email.toLowerCase();
    return (await this.list()).find((c) => c.email.toLowerCase() === lower) ?? null;
  }

  async find(predicate: (customer: Customer) => boolean): Promise<Customer[]> {
    return (await this.list()).filter(predicate);
  }

  async create(data: Omit<Customer, "id" | "createdAt" | "updatedAt">): Promise<Customer> {
    const now = new Date().toISOString();
    const record: Customer = { ...data, id: `cus_${Date.now()}`, createdAt: now, updatedAt: now };
    return this.table.append(record);
  }

  async update(id: string, data: Partial<Customer>): Promise<Customer> {
    const existing = await this.table.get(id);
    if (!existing) throw new Error(`Customer ${id} not found`);
    const updated: Customer = { ...existing, ...data, updatedAt: new Date().toISOString() };
    return this.table.updateById(id, updated);
  }

  async delete(id: string): Promise<void> {
    await this.table.deleteById(id);
  }
}
