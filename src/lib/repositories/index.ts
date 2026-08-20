import { ExcelQueryRepository } from "./excel/queryRepository";
import { ExcelHotelRepository } from "./excel/hotelRepository";
import { ExcelTransportRepository } from "./excel/transportRepository";
import { ExcelActivityRepository } from "./excel/activityRepository";
import { ExcelSupplierRepository } from "./excel/supplierRepository";
import { ExcelQuotationRepository } from "./excel/quotationRepository";
import { ExcelSentHistoryRepository } from "./excel/sentHistoryRepository";
import { ExcelUserRepository } from "./excel/userRepository";
import { ExcelRoleRepository } from "./excel/roleRepository";
import { ExcelAuditLogRepository } from "./excel/auditLogRepository";
import { ExcelBookingRepository } from "./excel/bookingRepository";
import { ExcelPaymentRepository } from "./excel/paymentRepository";
import { ExcelRateSheetRepository } from "./excel/rateSheetRepository";
import { ExcelCustomerRepository } from "./excel/customerRepository";
import { ExcelInvoiceRepository } from "./excel/invoiceRepository";
import { ExcelPermissionRepository } from "./excel/permissionRepository";
import { ExcelAddOnRepository } from "./excel/addOnRepository";
import { ExcelImportBatchRepository } from "./excel/importRepository";
import { ComputedStatsRepository } from "./computedStatsRepository";
import type {
  ActivityRepository,
  AddOnRepository,
  AuditLogRepository,
  BookingRepository,
  CustomerRepository,
  HotelRepository,
  ImportBatchRepository,
  InvoiceRepository,
  PaymentRepository,
  PermissionRepository,
  QueryRepository,
  QuotationRepository,
  RateSheetRepository,
  RoleRepository,
  SentHistoryRepository,
  StatsRepository,
  SupplierRepository,
  TransportRepository,
  UserRepository,
} from "./types";

/**
 * Single entry point the rest of the app imports from. Every repository is
 * backed by the local `database/data.xlsx` workbook (see `src/lib/excel.ts`
 * and `./excel/*`) — there is no external service and no mode switch
 * anymore. Swapping in a real database later (Postgres/Supabase) would mean
 * writing new implementations against these same interfaces and pointing
 * the imports below at them; nothing outside this file would need to
 * change, same as when this was Google Sheets.
 *
 * Stats is the one exception: it's not backed by its own sheet at all.
 * `ComputedStatsRepository` aggregates live over the Query/Quotation/
 * Booking/Payment/AuditLog repositories below on every call, so the
 * dashboard has no hardcoded figures and genuinely starts at $0 / empty
 * until real bookings and payments exist.
 */

export const queryRepository: QueryRepository = new ExcelQueryRepository();
export const hotelRepository: HotelRepository = new ExcelHotelRepository();
export const transportRepository: TransportRepository = new ExcelTransportRepository();
export const activityRepository: ActivityRepository = new ExcelActivityRepository();
export const supplierRepository: SupplierRepository = new ExcelSupplierRepository();
export const quotationRepository: QuotationRepository = new ExcelQuotationRepository();
export const sentHistoryRepository: SentHistoryRepository = new ExcelSentHistoryRepository();
export const bookingRepository: BookingRepository = new ExcelBookingRepository();
export const paymentRepository: PaymentRepository = new ExcelPaymentRepository();
export const rateSheetRepository: RateSheetRepository = new ExcelRateSheetRepository();
export const userRepository: UserRepository = new ExcelUserRepository();
export const roleRepository: RoleRepository = new ExcelRoleRepository();
export const auditLogRepository: AuditLogRepository = new ExcelAuditLogRepository();
export const customerRepository: CustomerRepository = new ExcelCustomerRepository();
export const invoiceRepository: InvoiceRepository = new ExcelInvoiceRepository();
export const permissionRepository: PermissionRepository = new ExcelPermissionRepository();
export const addOnRepository: AddOnRepository = new ExcelAddOnRepository();
export const importBatchRepository: ImportBatchRepository = new ExcelImportBatchRepository();

export const statsRepository: StatsRepository = new ComputedStatsRepository(
  queryRepository,
  quotationRepository,
  bookingRepository,
  paymentRepository,
  auditLogRepository
);
