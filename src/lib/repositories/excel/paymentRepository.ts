import { ExcelTable } from "./excelTable";
import type { PaymentRepository } from "../types";
import type { Payment } from "@/types/domain";

const COLUMNS = ["id", "bookingId", "direction", "amount", "method", "reference", "notes", "paidAt", "recordedByUserId", "createdAt"];

function rowToRecord(row: string[]): Payment {
  const [id, bookingId, direction, amount, method, reference, notes, paidAt, recordedByUserId, createdAt] = row;
  return {
    id, bookingId,
    direction: (direction as Payment["direction"]) || "Received",
    amount: Number(amount) || 0,
    method: (method as Payment["method"]) || "Other",
    reference: reference || undefined,
    notes: notes || undefined,
    paidAt, recordedByUserId, createdAt,
  };
}

function recordToRow(r: Payment): string[] {
  return [r.id, r.bookingId, r.direction, String(r.amount), r.method, r.reference ?? "", r.notes ?? "", r.paidAt, r.recordedByUserId, r.createdAt];
}

export class ExcelPaymentRepository implements PaymentRepository {
  private table = new ExcelTable<Payment>("Payments", COLUMNS, rowToRecord, recordToRow);

  async list(): Promise<Payment[]> {
    const all = await this.table.list();
    return all.sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  }

  async listByBooking(bookingId: string): Promise<Payment[]> {
    const all = await this.list();
    return all.filter((p) => p.bookingId === bookingId);
  }

  async create(data: Omit<Payment, "id" | "createdAt">): Promise<Payment> {
    const record: Payment = { ...data, id: `pay_${Date.now()}_${Math.floor(Math.random() * 10000)}`, createdAt: new Date().toISOString() };
    return this.table.append(record);
  }
}
