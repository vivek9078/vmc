import type {
  ActivityItem,
  AddOnItem,
  AuditLogEntry,
  Booking,
  Customer,
  DashboardStats,
  Hotel,
  ImportBatch,
  ImportRecord,
  Invoice,
  Payment,
  Quotation,
  RateSheetCategory,
  RateSheetItem,
  Role,
  SentRecord,
  Supplier,
  TransportItem,
  TravelQuery,
  User,
} from "@/types/domain";

/**
 * Every repository implementation (Google Sheets today, Postgres/Supabase
 * tomorrow, or an in-memory mock for local development without credentials)
 * must fulfill these same interfaces. Server actions and pages depend only
 * on these types, never on `googleapis` or any storage-specific client —
 * that's what makes the future migration a swap of ./googleSheets for
 * ./postgres rather than a rewrite.
 */

export interface QueryRepository {
  list(filters?: { status?: string; search?: string }): Promise<TravelQuery[]>;
  get(id: string): Promise<TravelQuery | null>;
  create(data: Omit<TravelQuery, "id" | "createdAt" | "updatedAt" | "status">): Promise<TravelQuery>;
  update(id: string, data: Partial<TravelQuery>): Promise<TravelQuery>;
  nextId(): Promise<string>; // generates the next VNQ-YYYY-NNNNNN id
}

export interface HotelRepository {
  list(filters?: { city?: string; search?: string }): Promise<Hotel[]>;
  get(id: string): Promise<Hotel | null>;
  create(data: Omit<Hotel, "id" | "createdAt" | "updatedAt">): Promise<Hotel>;
  update(id: string, data: Partial<Hotel>): Promise<Hotel>;
  findPossibleDuplicates(name: string, city: string): Promise<Hotel[]>;
  /** Finds a hotel previously created by CSV Sync with the same composite dedup key (see src/lib/csvSync). */
  findBySyncKey(syncKey: string): Promise<Hotel | null>;
}

export interface TransportRepository {
  list(filters?: { search?: string }): Promise<TransportItem[]>;
  get(id: string): Promise<TransportItem | null>;
  create(data: Omit<TransportItem, "id" | "createdAt" | "updatedAt">): Promise<TransportItem>;
  update(id: string, data: Partial<TransportItem>): Promise<TransportItem>;
  findBySyncKey(syncKey: string): Promise<TransportItem | null>;
  findByDutyCode(dutyCode: string, vehicleType: string): Promise<TransportItem | null>;
}

export interface ActivityRepository {
  list(filters?: { city?: string; search?: string }): Promise<ActivityItem[]>;
  get(id: string): Promise<ActivityItem | null>;
  create(data: Omit<ActivityItem, "id" | "createdAt" | "updatedAt">): Promise<ActivityItem>;
  update(id: string, data: Partial<ActivityItem>): Promise<ActivityItem>;
  findBySyncKey(syncKey: string): Promise<ActivityItem | null>;
}

export interface AddOnRepository {
  list(filters?: { search?: string; serviceType?: string }): Promise<AddOnItem[]>;
  get(id: string): Promise<AddOnItem | null>;
  create(data: Omit<AddOnItem, "id" | "createdAt" | "updatedAt">): Promise<AddOnItem>;
  update(id: string, data: Partial<AddOnItem>): Promise<AddOnItem>;
  findBySyncKey(syncKey: string): Promise<AddOnItem | null>;
}

/** Audit + rollback trail for CSV Sync imports (src/lib/csvSync). See domain.ts for the shape rationale. */
export interface ImportBatchRepository {
  list(): Promise<ImportBatch[]>;
  get(id: string): Promise<ImportBatch | null>;
  create(data: Omit<ImportBatch, "id" | "createdAt" | "updatedAt">): Promise<ImportBatch>;
  update(id: string, data: Partial<ImportBatch>): Promise<ImportBatch>;

  listRecords(batchId: string): Promise<ImportRecord[]>;
  addRecord(data: Omit<ImportRecord, "id" | "createdAt">): Promise<ImportRecord>;
}

export interface SupplierRepository {
  list(filters?: { search?: string }): Promise<Supplier[]>;
  create(data: Omit<Supplier, "id" | "createdAt" | "updatedAt">): Promise<Supplier>;
  update(id: string, data: Partial<Supplier>): Promise<Supplier>;
}

export interface RateSheetRepository {
  listCategories(): Promise<RateSheetCategory[]>;
  getCategory(id: string): Promise<RateSheetCategory | null>;
  createCategory(data: Omit<RateSheetCategory, "id" | "createdAt" | "updatedAt">): Promise<RateSheetCategory>;
  /** Upserted by name — used by the Excel importer so re-uploading the same tab doesn't duplicate it. */
  upsertCategoryByName(data: Omit<RateSheetCategory, "id" | "createdAt" | "updatedAt">): Promise<RateSheetCategory>;

  list(categoryId: string): Promise<RateSheetItem[]>;
  create(data: Omit<RateSheetItem, "id" | "createdAt" | "updatedAt">): Promise<RateSheetItem>;
  update(id: string, data: Partial<RateSheetItem>): Promise<RateSheetItem>;
  /** Upserted by (categoryId, name) — used by the Excel importer to update existing rows on re-upload. */
  upsertByName(data: Omit<RateSheetItem, "id" | "createdAt" | "updatedAt">): Promise<{ item: RateSheetItem; created: boolean }>;
}

export interface StatsRepository {
  getDashboardStats(): Promise<DashboardStats>;
}

export interface QuotationRepository {
  list(): Promise<Quotation[]>;
  listForQuery(queryId: string): Promise<Quotation[]>;
  get(id: string): Promise<Quotation | null>;
  create(queryId: string, packageName: string): Promise<Quotation>;
  update(id: string, data: Partial<Quotation>): Promise<Quotation>;
  duplicate(id: string): Promise<Quotation>;
}

export interface SentHistoryRepository {
  listForQuotation(quotationId: string): Promise<SentRecord[]>;
  record(entry: Omit<SentRecord, "id" | "sentAt">): Promise<SentRecord>;
}

// =============================================================================
// Identity, RBAC & Audit
// =============================================================================

export interface UserRepository {
  list(): Promise<User[]>;
  get(id: string): Promise<User | null>;
  /** `email` is matched case-insensitively; callers should still lowercase before calling. */
  getByEmail(email: string): Promise<User | null>;
  create(data: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
}

export interface RoleRepository {
  list(): Promise<Role[]>;
  get(id: string): Promise<Role | null>;
  create(data: Omit<Role, "id" | "createdAt" | "updatedAt">): Promise<Role>;
  update(id: string, data: Partial<Role>): Promise<Role>;
  delete(id: string): Promise<void>;
}

export interface AuditLogRepository {
  list(filters?: { userId?: string; entityType?: string; limit?: number }): Promise<AuditLogEntry[]>;
  record(entry: Omit<AuditLogEntry, "id" | "createdAt">): Promise<AuditLogEntry>;
}

export interface BookingRepository {
  list(): Promise<Booking[]>;
  get(id: string): Promise<Booking | null>;
  listByQuery(queryId: string): Promise<Booking[]>;
  create(data: Omit<Booking, "id" | "createdAt" | "updatedAt">): Promise<Booking>;
  update(id: string, data: Partial<Booking>): Promise<Booking>;
  nextId(): Promise<string>; // generates the next BK-YYYY-NNNNNN id
}

export interface PaymentRepository {
  list(): Promise<Payment[]>;
  listByBooking(bookingId: string): Promise<Payment[]>;
  create(data: Omit<Payment, "id" | "createdAt">): Promise<Payment>;
}

export interface CustomerRepository {
  list(): Promise<Customer[]>;
  get(id: string): Promise<Customer | null>;
  findByEmail(email: string): Promise<Customer | null>;
  create(data: Omit<Customer, "id" | "createdAt" | "updatedAt">): Promise<Customer>;
  update(id: string, data: Partial<Customer>): Promise<Customer>;
  delete(id: string): Promise<void>;
}

export interface InvoiceRepository {
  list(): Promise<Invoice[]>;
  get(id: string): Promise<Invoice | null>;
  listByBooking(bookingId: string): Promise<Invoice[]>;
  create(data: Omit<Invoice, "id" | "createdAt" | "updatedAt">): Promise<Invoice>;
  update(id: string, data: Partial<Invoice>): Promise<Invoice>;
  delete(id: string): Promise<void>;
}

/**
 * Read-only view over the permission catalog. Permissions are intentionally
 * defined in code (`PERMISSIONS` in src/lib/rbac.ts), not editable data —
 * every permission check in the app (`requireAuth`, `hasPermission`) is
 * security-sensitive, so it must be validated against a fixed, deployable
 * catalog rather than a spreadsheet cell someone could edit at runtime.
 * `ExcelPermissionRepository` mirrors that catalog into the Permissions
 * sheet (for visibility if you open the workbook directly) but always reads
 * from and writes back to the code catalog, never trusting the sheet as a
 * source of truth.
 */
export interface PermissionRepository {
  list(): Promise<{ id: string; label: string; group: string }[]>;
  get(id: string): Promise<{ id: string; label: string; group: string } | null>;
  find(predicate: (p: { id: string; label: string; group: string }) => boolean): Promise<{ id: string; label: string; group: string }[]>;
}
