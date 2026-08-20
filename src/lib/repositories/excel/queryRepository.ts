import { ExcelTable } from "./excelTable";
import type { QueryRepository } from "../types";
import type { TravelQuery } from "@/types/domain";

// Column order in the "Queries" sheet tab. Row 1 should contain these as
// human-readable headers (they're informational only — the app addresses
// columns positionally, not by header name). New columns are always
// appended at the end (never inserted) so existing sheet rows keep parsing
// correctly positionally even though they predate these columns.
const COLUMNS = [
  "id", "querySource", "contactPerson", "referenceId", "salesTeamUserId",
  "tags", "destination", "travelDate", "numberOfNights", "adults", "children",
  "guestName", "phoneNumber", "specialNotes", "status", "createdAt", "updatedAt",
  "guestEmail",
  // --- Query Intake fields (Manual/Image/PDF/WhatsApp-Text) ---
  "departureDate", "durationDays", "infants", "rooms", "hotelCategory", "mealPlan",
  "transportPreference", "airportTransfer", "activitiesList", "budgetAmount", "budgetCurrency",
  "destinationBreakdown", "sourceType", "sourceLanguage", "originalInputText",
  "extractionStatusJson", "reviewStatus", "approvedByUserId", "approvedAt", "uploadedFileName",
];

function rowToRecord(row: string[]): TravelQuery {
  const [
    id, querySource, contactPerson, referenceId, salesTeamUserId,
    tagsCsv, destination, travelDate, numberOfNights, adults, children,
    guestName, phoneNumber, specialNotes, status, createdAt, updatedAt,
    guestEmail,
    departureDate, durationDays, infants, rooms, hotelCategory, mealPlan,
    transportPreference, airportTransfer, activitiesListCsv, budgetAmount, budgetCurrency,
    destinationBreakdown, sourceType, sourceLanguage, originalInputText,
    extractionStatusJson, reviewStatus, approvedByUserId, approvedAt, uploadedFileName,
  ] = row;

  return {
    id,
    querySource,
    contactPerson,
    referenceId: referenceId || undefined,
    salesTeamUserId,
    tags: tagsCsv ? tagsCsv.split(",").map((t) => t.trim()).filter(Boolean) : [],
    destination,
    travelDate,
    numberOfNights: Number(numberOfNights) || 0,
    adults: Number(adults) || 0,
    children: Number(children) || 0,
    guestName: guestName || undefined,
    guestEmail: guestEmail || undefined,
    phoneNumber: phoneNumber || undefined,
    specialNotes: specialNotes || undefined,
    status: (status as TravelQuery["status"]) || "Draft",
    createdAt,
    updatedAt,

    departureDate: departureDate || undefined,
    durationDays: durationDays ? Number(durationDays) || undefined : undefined,
    infants: infants ? Number(infants) || undefined : undefined,
    rooms: rooms ? Number(rooms) || undefined : undefined,
    hotelCategory: hotelCategory || undefined,
    mealPlan: mealPlan || undefined,
    transportPreference: transportPreference || undefined,
    airportTransfer: airportTransfer === "true" ? true : airportTransfer === "false" ? false : undefined,
    activitiesList: activitiesListCsv ? activitiesListCsv.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
    budgetAmount: budgetAmount ? Number(budgetAmount) || undefined : undefined,
    budgetCurrency: budgetCurrency || undefined,
    destinationBreakdown: destinationBreakdown || undefined,
    sourceType: (sourceType as TravelQuery["sourceType"]) || undefined,
    sourceLanguage: sourceLanguage || undefined,
    originalInputText: originalInputText || undefined,
    extractionStatusJson: extractionStatusJson || undefined,
    reviewStatus: (reviewStatus as TravelQuery["reviewStatus"]) || undefined,
    approvedByUserId: approvedByUserId || undefined,
    approvedAt: approvedAt || undefined,
    uploadedFileName: uploadedFileName || undefined,
  };
}

function recordToRow(record: TravelQuery): string[] {
  return [
    record.id,
    record.querySource,
    record.contactPerson,
    record.referenceId ?? "",
    record.salesTeamUserId,
    record.tags.join(", "),
    record.destination,
    record.travelDate,
    String(record.numberOfNights),
    String(record.adults),
    String(record.children),
    record.guestName ?? "",
    record.phoneNumber ?? "",
    record.specialNotes ?? "",
    record.status,
    record.createdAt,
    record.updatedAt,
    record.guestEmail ?? "",

    record.departureDate ?? "",
    record.durationDays != null ? String(record.durationDays) : "",
    record.infants != null ? String(record.infants) : "",
    record.rooms != null ? String(record.rooms) : "",
    record.hotelCategory ?? "",
    record.mealPlan ?? "",
    record.transportPreference ?? "",
    record.airportTransfer != null ? String(record.airportTransfer) : "",
    record.activitiesList ? record.activitiesList.join(", ") : "",
    record.budgetAmount != null ? String(record.budgetAmount) : "",
    record.budgetCurrency ?? "",
    record.destinationBreakdown ?? "",
    record.sourceType ?? "",
    record.sourceLanguage ?? "",
    record.originalInputText ?? "",
    record.extractionStatusJson ?? "",
    record.reviewStatus ?? "",
    record.approvedByUserId ?? "",
    record.approvedAt ?? "",
    record.uploadedFileName ?? "",
  ];
}

export class ExcelQueryRepository implements QueryRepository {
  private table = new ExcelTable<TravelQuery>("Queries", COLUMNS, rowToRecord, recordToRow);

  async list(filters?: { status?: string; search?: string }): Promise<TravelQuery[]> {
    let result = await this.table.list();
    if (filters?.status) result = result.filter((q) => q.status === filters.status);
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(
        (q) =>
          q.id.toLowerCase().includes(s) ||
          (q.guestName ?? "").toLowerCase().includes(s) ||
          (q.phoneNumber ?? "").includes(s) ||
          q.destination.toLowerCase().includes(s)
      );
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<TravelQuery | null> {
    return this.table.get(id);
  }

  private nextIdFrom(all: TravelQuery[]): string {
    const year = new Date().getFullYear();
    const prefix = `VNQ-${year}-`;
    const thisYearIds = all
      .map((q) => q.id)
      .filter((id) => id.startsWith(prefix))
      .map((id) => Number(id.slice(prefix.length)) || 0);
    const next = (thisYearIds.length ? Math.max(...thisYearIds) : 0) + 1;
    return `${prefix}${String(next).padStart(6, "0")}`;
  }

  async nextId(): Promise<string> {
    return this.nextIdFrom(await this.table.list());
  }

  async create(data: Omit<TravelQuery, "id" | "createdAt" | "updatedAt" | "status">): Promise<TravelQuery> {
    const now = new Date().toISOString();
    return this.table.appendComputed((existing) => ({
      ...data, id: this.nextIdFrom(existing), status: "Draft", createdAt: now, updatedAt: now,
    }));
  }

  async update(id: string, data: Partial<TravelQuery>): Promise<TravelQuery> {
    const existing = await this.table.get(id);
    if (!existing) throw new Error(`Query ${id} not found`);
    const updated: TravelQuery = { ...existing, ...data, updatedAt: new Date().toISOString() };
    return this.table.updateById(id, updated);
  }
}
