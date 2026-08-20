// =============================================================================
// Domain types. These are storage-agnostic — the same shapes are used whether
// the data lives in Google Sheets today or Postgres/Supabase after a future
// migration. Only the repository implementations in ./googleSheets or a future
// ./postgres need to change; nothing in the UI or services layer should.
// =============================================================================

export type QueryStatus =
  | "Draft"
  | "Quotation Created"
  | "Quotation Sent"
  | "Confirmed"
  | "Cancelled"
  | "Completed"
  | "Archived";

// =============================================================================
// Identity, RBAC & Audit (dynamic — replaces the old hardcoded UserRole enum)
// =============================================================================

/** A staff account. Roles are assigned dynamically via `roleId`, not a fixed enum. */
export interface User {
  id: string;
  name: string;
  email: string; // login identifier, stored lowercase, unique
  passwordHash: string; // bcrypt — NEVER sent to the client, NEVER logged
  roleId: string; // FK -> Role.id
  status: "Active" | "Inactive";
  /**
   * True only for the bootstrap Super Admin account(s). Super Admins bypass
   * all permission checks and are the only accounts allowed to manage
   * spreadsheet connections/mapping (see Settings > Connections). This flag
   * cannot be granted through the Roles GUI — only by editing the Users
   * sheet directly — so a misconfigured role can never lock everyone out.
   */
  isSuperAdmin: boolean;
  failedLoginAttempts: number;
  lockedUntil?: string; // ISO datetime; account login is blocked until this passes
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** A dynamic, admin-editable role — replaces the old static Admin/Sales/Operations/Finance map. */
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissionIds: string[]; // FK -> PermissionDef.id (see src/lib/rbac.ts)
  /** System roles (seeded on first run) can be edited but not deleted, so there's always a valid fallback. */
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AuditAction =
  | "login" | "login_failed" | "logout"
  | "create" | "update" | "delete"
  | "permission_denied" | "export" | "send"
  | "extract";

export interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: AuditAction;
  entityType: string; // "User" | "Role" | "Query" | "Hotel" | "Connection" | ...
  entityId?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

/**
 * Standalone customer record. Not yet wired into any page — TravelQuery
 * currently carries guest contact details inline (guestName, phoneNumber).
 * Included as its own sheet/repository per the requested workbook
 * structure, ready for a future "link a query to a returning customer"
 * feature without needing another storage migration.
 */
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = "Draft" | "Issued" | "Paid" | "Overdue" | "Cancelled";

/**
 * Standalone invoice record, one level above a Booking's Payments ledger.
 * Not yet wired into any page — Bookings/Payments (Phase 3) cover the
 * actual money-in/money-out tracking the app uses today. Included as its
 * own sheet/repository per the requested workbook structure.
 */
export interface Invoice {
  id: string;
  bookingId: string;
  invoiceNumber: string;
  amount: number;
  status: InvoiceStatus;
  issuedAt?: string;
  dueAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type QuerySourceType = "Manual" | "Image" | "PDF" | "WhatsApp/Text";

export interface TravelQuery {
  id: string; // e.g. "VNQ-2026-000001"
  querySource: string;
  contactPerson: string;
  referenceId?: string;
  salesTeamUserId: string;
  tags: string[];
  destination: string;
  travelDate: string; // ISO date
  numberOfNights: number;
  adults: number;
  children: number;
  guestName?: string;
  guestEmail?: string;
  phoneNumber?: string;
  specialNotes?: string;
  status: QueryStatus;
  createdAt: string; // ISO datetime
  updatedAt: string;

  // --- Query Intake (Manual/Image/PDF/WhatsApp-Text) — all optional, added
  // backward-compatibly. Older rows simply have these blank. ---
  departureDate?: string; // ISO date
  durationDays?: number;
  infants?: number;
  rooms?: number;
  hotelCategory?: string; // "3" | "4" | "5" | "Luxury" | "Budget" | "Boutique" | ...
  mealPlan?: string;
  transportPreference?: string;
  airportTransfer?: boolean;
  activitiesList?: string[];
  budgetAmount?: number;
  budgetCurrency?: string;
  /** JSON-encoded [{ name: string; nights?: number }] — kept as its own field rather than overloading `destination`, since `destination` is constrained to a single fixed value elsewhere in the app. */
  destinationBreakdown?: string;

  // --- Provenance / review trail ---
  sourceType?: QuerySourceType;
  sourceLanguage?: string; // "English" | "Vietnamese" | "Unknown" | ...
  originalInputText?: string;
  /** JSON-encoded Record<fieldName, "Detected" | "Not Detected" | "Needs Review" | "User Confirmed"> */
  extractionStatusJson?: string;
  reviewStatus?: "Pending Review" | "Approved";
  approvedByUserId?: string;
  approvedAt?: string;
  uploadedFileName?: string;
}

export interface Hotel {
  id: string;
  name: string;
  city: string;
  starRating: number;
  roomTypes: string[];
  mealPlans: string[];
  supplierId: string;
  supplierContact?: string;
  supplierCost: number; // NEVER surface to customer-facing views/PDFs
  sellingCost: number;
  cancellationPolicy?: string;
  checkInTime?: string;
  checkOutTime?: string;
  /** Rate validity window — the date range these hotel rates apply for (e.g. a season). Optional; when both are set, the UI shows the number of days between them. */
  availableFrom?: string;
  availableTo?: string;
  images: string[];
  internalNotes?: string; // staff-only, never in PDF
  status: "Active" | "Inactive";
  /** When set, this hotel's sellingCost auto-updates from the linked rate-sheet item/column on every import. */
  linkedRateItemId?: string;
  linkedRateColumnId?: string;
  // --- CSV Sync fields — all optional, populated only for imported rows ---
  area?: string;
  roomType?: string; // single room type as it appeared on the imported row, distinct from the roomTypes[] catalog
  mealPlan?: string;
  season?: string;
  dutyCode?: string;
  syncKey?: string;
  sourceImportBatchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransportItem {
  id: string;
  vehicleType: string;
  capacity: number;
  supplierId: string;
  pickup: string;
  drop: string;
  cost: number; // hidden from customer
  selling: number;
  remarks?: string;
  status: "Active" | "Inactive";
  /** Rate validity window — the date range this rate applies for. Optional; when both are set, the UI shows the number of days between them. */
  availableFrom?: string;
  availableTo?: string;
  /** When set, this item's selling price auto-updates from the linked rate-sheet item/column on every import. */
  linkedRateItemId?: string;
  linkedRateColumnId?: string;
  // --- CSV Sync fields (see src/lib/csvSync) — all optional, populated only for imported rows ---
  service?: string; // e.g. "PVT", "SIC", "Transfer"
  distance?: string;
  startTime?: string;
  daySchedule?: string;
  season?: string;
  dutyCode?: string; // supplier duty/service code — the most stable dedup key when present
  syncKey?: string; // composite dedup key computed for CSV-sourced rows (from|to|service|vehicleType|season)
  sourceImportBatchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  name: string;
  city: string;
  supplierId: string;
  duration: string;
  operatingDays: string[];
  cost: number; // hidden from customer
  selling: number;
  remarks?: string;
  /** Rate validity window — the date range this rate applies for. Optional; when both are set, the UI shows the number of days between them. */
  availableFrom?: string;
  availableTo?: string;
  /** When set, this item's selling price auto-updates from the linked rate-sheet item/column on every import. */
  linkedRateItemId?: string;
  linkedRateColumnId?: string;
  // --- CSV Sync fields — all optional, populated only for imported rows ---
  service?: string;
  startTime?: string;
  season?: string;
  dutyCode?: string;
  syncKey?: string;
  sourceImportBatchId?: string;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

/**
 * Add-on / ancillary service — airport pickup, guide, night surcharge, child
 * seat, entrance fee, etc. Populated primarily by CSV Sync (src/lib/csvSync)
 * from rows that don't represent a hotel/transport/activity in their own
 * right, but is also manageable directly from the Add-ons portal.
 */
export interface AddOnItem {
  id: string;
  name: string;
  description?: string;
  serviceType?: string; // "Airport Pickup", "Guide", "Surcharge", ...
  price: number;
  currency?: string;
  vehicleType?: string;
  duration?: string;
  startTime?: string;
  distance?: string;
  schedule?: string;
  season?: string;
  supplierId?: string;
  relatedEntityType?: "hotel" | "transport" | "activity";
  relatedEntityId?: string;
  dutyCode?: string;
  syncKey?: string;
  sourceImportBatchId?: string;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  country: string;
  paymentTerms?: string;
  gst?: string;
  bankDetails?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  todaysQueries: number;
  pendingQuotations: number;
  confirmedQuotations: number;
  upcomingTrips: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  topDestinations: { name: string; count: number }[];
  popularHotels: { name: string; count: number }[];
  recentActivity: { id: string; label: string; timestamp: string }[];
  salesPerformance: { month: string; revenue: number; profit: number }[];
}

// =============================================================================
// Quotation Builder (Phase 2)
// =============================================================================

export type QuotationDocStatus = "Draft" | "Ready" | "Sent" | "Accepted" | "Rejected" | "Expired";

export interface QuotationHotelLine {
  id: string;
  hotelId: string;
  hotelName: string; // snapshot at time of selection, so renaming a hotel later doesn't rewrite history
  city: string;
  nights: number;
  rooms: number;
  costPrice: number; // per-stay total; NEVER surfaced to customer PDF
  sellingPrice: number; // per-stay total
}

export interface QuotationTransportLine {
  id: string;
  transportId: string;
  vehicleType: string;
  day: number;
  costPrice: number;
  sellingPrice: number;
}

export interface QuotationActivityLine {
  id: string;
  activityId: string;
  activityName: string;
  day: number;
  pax: number;
  costPrice: number;
  sellingPrice: number;
}

export interface PricingBreakdown {
  hotelTotal: number;
  transportTotal: number;
  activitiesTotal: number;
  costTotal: number; // hotelTotal + transportTotal + activitiesTotal (supplier cost basis)
  sellingSubtotal: number; // sum of selling prices before markup/discount/GST adjustments
  markupPercent: number;
  markupAmount: number;
  discountPercent: number;
  discountAmount: number;
  gstPercent: number;
  gstAmount: number;
  finalSellingPrice: number;
  profit: number; // finalSellingPrice - costTotal
  margin: number; // profit / finalSellingPrice, as a percent
}

export interface Quotation {
  id: string; // e.g. "VNQ-2026-000001-Q1"
  queryId: string;
  packageName: string; // "Standard", "Premium", "Luxury", "Honeymoon", "Family", "Custom"
  status: QuotationDocStatus;

  hotelLines: QuotationHotelLine[];
  transportLines: QuotationTransportLine[];
  activityLines: QuotationActivityLine[];

  markupPercent: number;
  discountPercent: number;
  gstPercent: number;

  internalComments?: string; // staff-only, never in PDF or customer view

  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Bookings & Accounts (Phase 3)
// =============================================================================

export type BookingStatus = "Confirmed" | "Completed" | "Cancelled";

/**
 * Created the moment a quotation is confirmed — the single source of truth
 * the dashboard's financial figures are computed from ("real bookings").
 * `costTotal` / `sellingTotal` / `profit` are a SNAPSHOT of the quotation's
 * pricing at confirmation time: later rate-sheet changes to the underlying
 * hotels/transport/activities must never retroactively change a booking
 * that's already confirmed.
 */
export interface Booking {
  id: string; // e.g. "BK-2026-000001"
  queryId: string;
  quotationId: string;
  guestName: string;
  destination: string;
  travelDate: string; // ISO date, snapshot from the query at confirmation time
  numberOfNights: number;
  packageName: string;
  salesTeamUserId: string;
  costTotal: number;
  sellingTotal: number;
  profit: number;
  status: BookingStatus;
  confirmedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentDirection = "Received" | "Paid"; // Received = from the customer, Paid = to a supplier
export type PaymentMethod = "Bank Transfer" | "Card" | "Cash" | "UPI" | "Other";

/** A single payment against a Booking. The Accounts ledger and every dashboard revenue figure are sums over these records — nothing is hardcoded. */
export interface Payment {
  id: string;
  bookingId: string;
  direction: PaymentDirection;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  paidAt: string; // ISO date the payment was actually made/received
  recordedByUserId: string;
  createdAt: string;
}

// =============================================================================
// Rate Sheet (destination rate cards — mirrors the multi-tab DMC master
// workbook: one tab per destination/service-mode, e.g. "Hanoi SIC, Ticket" or
// "Hanoi Airport, PVT Tour"). Each category defines its own set of price
// columns (pax bands for SIC/ticket tabs, vehicle-size bands for PVT tabs),
// and every item can carry one or more seasons, each with its own date range
// and a price per column. This shape is what both the on-screen rate table
// and the Excel importer target.
// =============================================================================

export type RateSheetServiceMode = "SIC" | "PVT" | "Group" | "Other";

/** One selectable price band for a category, e.g. "Adult" or "16 Seater". */
export interface RateSheetPriceColumn {
  id: string; // stable slug, e.g. "adult", "child_4_5", "seater_16"
  label: string; // display label, e.g. "Adult", "Child (4-5)", "16 Seater"
}

/** A destination/service-mode tab, e.g. "Hanoi SIC, Ticket". */
export interface RateSheetCategory {
  id: string; // slug
  name: string; // tab label as it appears in the source workbook
  destination: string; // "Hanoi", "Danang", "Ho Chi Minh"...
  serviceMode: RateSheetServiceMode;
  priceColumns: RateSheetPriceColumn[]; // shared across every item in this category
  createdAt: string;
  updatedAt: string;
}

/** One season's pricing for an item — one value per category price column. */
export interface RateSheetSeason {
  id: string;
  label: string; // "1 Jan 2026 - 31 Dec 2026" (kept verbatim for display)
  startDate?: string; // ISO date, parsed from label when possible
  endDate?: string; // ISO date, parsed from label when possible
  prices: Record<string, number>; // keyed by RateSheetPriceColumn.id, USD
}

/** A single rate/service row, e.g. "Hanoi City Tour - Full Day". */
export interface RateSheetItem {
  id: string;
  categoryId: string;
  name: string;
  service: string; // "Transfer" / "Tickets" / "Include Tip" / "PVT" / "PVT Transfer"...
  description?: string;
  // SIC / ticket-style fields
  openTime?: string;
  closeTime?: string;
  durationMinutes?: number;
  slots?: string;
  // PVT-style fields
  distance?: string;
  startTime?: string;
  daySchedule?: string;
  seasons: RateSheetSeason[];
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Send history (email / WhatsApp) — Phase 3
// =============================================================================

export type SendChannel = "email" | "whatsapp";

/** A record of a drafted (not sent — the app no longer sends via any API) email/WhatsApp message, kept for audit history. */
export interface SentRecord {
  id: string;
  quotationId: string;
  channel: SendChannel;
  recipients: string[]; // email addresses, or WhatsApp numbers
  sentByUserId: string;
  sentAt: string;
  status: "drafted";
}

// =============================================================================
// CSV Sync — central import → Hotels / Transport / Activities / Add-ons
// (src/lib/csvSync). See ImportBatch for the audit/rollback trail.
// =============================================================================

export type SyncEntityType = "hotel" | "transport" | "activity" | "addon";

export interface ImportEntityCounts {
  hotel: number;
  transport: number;
  activity: number;
  addon: number;
}

export interface ImportRowError {
  rowNumber: number;
  message: string;
}

/** One CSV upload, synchronized across every relevant portal in a single batch. */
export interface ImportBatch {
  id: string;
  fileName: string;
  uploadedByUserId: string;
  uploadedByEmail: string;
  uploadedAt: string;
  totalRows: number;
  created: ImportEntityCounts;
  updated: ImportEntityCounts;
  skipped: number;
  errors: ImportRowError[];
  status: "Completed" | "RolledBack";
  rolledBackAt?: string;
  rolledBackByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * One created/updated record produced by an ImportBatch — the unit rollback
 * operates on. `previousValue` is a JSON snapshot of the fields this import
 * changed, captured before the write, so rollback can restore them.
 */
export interface ImportRecord {
  id: string;
  batchId: string;
  entityType: SyncEntityType;
  entityId: string;
  action: "created" | "updated";
  rowNumber: number;
  previousValue?: string; // JSON.stringify of prior field values, only for "updated"
  createdAt: string;
}
