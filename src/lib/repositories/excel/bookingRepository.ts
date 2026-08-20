import { ExcelTable } from "./excelTable";
import type { BookingRepository } from "../types";
import type { Booking } from "@/types/domain";

const COLUMNS = [
  "id", "queryId", "quotationId", "guestName", "destination", "travelDate", "numberOfNights",
  "packageName", "salesTeamUserId", "costTotal", "sellingTotal", "profit", "status",
  "confirmedByUserId", "createdAt", "updatedAt",
];

function rowToRecord(row: string[]): Booking {
  const [
    id, queryId, quotationId, guestName, destination, travelDate, numberOfNights,
    packageName, salesTeamUserId, costTotal, sellingTotal, profit, status,
    confirmedByUserId, createdAt, updatedAt,
  ] = row;
  return {
    id, queryId, quotationId, guestName, destination, travelDate,
    numberOfNights: Number(numberOfNights) || 0,
    packageName, salesTeamUserId,
    costTotal: Number(costTotal) || 0,
    sellingTotal: Number(sellingTotal) || 0,
    profit: Number(profit) || 0,
    status: (status as Booking["status"]) || "Confirmed",
    confirmedByUserId, createdAt, updatedAt,
  };
}

function recordToRow(r: Booking): string[] {
  return [
    r.id, r.queryId, r.quotationId, r.guestName, r.destination, r.travelDate, String(r.numberOfNights),
    r.packageName, r.salesTeamUserId, String(r.costTotal), String(r.sellingTotal), String(r.profit), r.status,
    r.confirmedByUserId, r.createdAt, r.updatedAt,
  ];
}

export class ExcelBookingRepository implements BookingRepository {
  private table = new ExcelTable<Booking>("Bookings", COLUMNS, rowToRecord, recordToRow);

  async list(): Promise<Booking[]> {
    const all = await this.table.list();
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<Booking | null> {
    return this.table.get(id);
  }

  async listByQuery(queryId: string): Promise<Booking[]> {
    const all = await this.table.list();
    return all.filter((b) => b.queryId === queryId);
  }

  private nextIdFrom(all: Booking[]): string {
    const year = new Date().getFullYear();
    const prefix = `BK-${year}-`;
    const thisYearNumbers = all
      .map((b) => b.id)
      .filter((id) => id.startsWith(prefix))
      .map((id) => Number(id.slice(prefix.length)) || 0);
    const next = (thisYearNumbers.length ? Math.max(...thisYearNumbers) : 0) + 1;
    return `${prefix}${String(next).padStart(6, "0")}`;
  }

  async nextId(): Promise<string> {
    return this.nextIdFrom(await this.table.list());
  }

  async create(data: Omit<Booking, "id" | "createdAt" | "updatedAt">): Promise<Booking> {
    const now = new Date().toISOString();
    return this.table.appendComputed((existing) => ({ ...data, id: this.nextIdFrom(existing), createdAt: now, updatedAt: now }));
  }

  async update(id: string, data: Partial<Booking>): Promise<Booking> {
    const existing = await this.table.get(id);
    if (!existing) throw new Error(`Booking ${id} not found`);
    const updated: Booking = { ...existing, ...data, updatedAt: new Date().toISOString() };
    return this.table.updateById(id, updated);
  }
}
