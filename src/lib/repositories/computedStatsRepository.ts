import type {
  BookingRepository,
  PaymentRepository,
  QueryRepository,
  QuotationRepository,
  AuditLogRepository,
  StatsRepository,
} from "./types";
import type { DashboardStats } from "@/types/domain";

const RECENT_ACTIVITY_LIMIT = 8;
const SALES_PERFORMANCE_MONTHS = 6;

// Audit actions that are noise on a business dashboard — kept in the Audit
// Logs screen but filtered out of "Recent Activity" here.
const ACTIVITY_NOISE_ACTIONS = new Set(["login", "logout", "login_failed", "permission_denied"]);

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
}

/**
 * Computes the entire dashboard from the app's actual repositories every
 * time it's requested — nothing here is a constant. With zero Queries,
 * Bookings, and Payments (a fresh install), every count is 0, every total
 * is $0, and every list is empty: the dashboard genuinely starts at $0
 * until real bookings exist, as opposed to displaying placeholder figures.
 */
export class ComputedStatsRepository implements StatsRepository {
  constructor(
    private queryRepository: QueryRepository,
    private quotationRepository: QuotationRepository,
    private bookingRepository: BookingRepository,
    private paymentRepository: PaymentRepository,
    private auditLogRepository: AuditLogRepository
  ) {}

  async getDashboardStats(): Promise<DashboardStats> {
    const [queries, quotations, bookings, payments, recentLogs] = await Promise.all([
      this.queryRepository.list(),
      this.quotationRepository.list(),
      this.bookingRepository.list(),
      this.paymentRepository.list(),
      this.auditLogRepository.list({ limit: 100 }),
    ]);

    const now = new Date();
    const monthStart = startOfMonth(now);
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // ---- Overview counters ----
    const todaysQueries = queries.filter((q) => isSameUtcDay(new Date(q.createdAt), now)).length;
    const pendingQuotations = quotations.filter((q) => q.status === "Sent" || q.status === "Ready").length;
    const confirmedBookings = bookings.filter((b) => b.status === "Confirmed" || b.status === "Completed");
    const confirmedQuotations = confirmedBookings.length;
    const upcomingTrips = confirmedBookings.filter((b) => new Date(b.travelDate).getTime() >= todayStart.getTime()).length;

    // ---- Financials — strictly from Bookings (confirmed sale value / profit) and Payments (cash actually collected) ----
    const monthlyRevenue = payments
      .filter((p) => p.direction === "Received" && new Date(p.paidAt) >= monthStart)
      .reduce((sum, p) => sum + p.amount, 0);

    const monthlyProfit = confirmedBookings
      .filter((b) => new Date(b.createdAt) >= monthStart)
      .reduce((sum, b) => sum + b.profit, 0);

    // ---- Top destinations — from all queries raised, not just confirmed ones, so it's a useful signal from day one ----
    const destinationCounts = new Map<string, number>();
    for (const q of queries) {
      if (!q.destination) continue;
      destinationCounts.set(q.destination, (destinationCounts.get(q.destination) ?? 0) + 1);
    }
    const topDestinations = Array.from(destinationCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // ---- Popular hotels — from every quotation's hotel line items across every query ----
    const hotelCounts = new Map<string, number>();
    for (const quotation of quotations) {
      for (const line of quotation.hotelLines) {
        hotelCounts.set(line.hotelName, (hotelCounts.get(line.hotelName) ?? 0) + 1);
      }
    }
    const popularHotels = Array.from(hotelCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // ---- Recent activity — real audit trail, minus login/permission noise ----
    const recentActivity = recentLogs
      .filter((log) => !ACTIVITY_NOISE_ACTIONS.has(log.action))
      .slice(0, RECENT_ACTIVITY_LIMIT)
      .map((log) => ({
        id: log.id,
        label: describeAuditEntry(log.action, log.entityType, log.entityId, log.details),
        timestamp: log.createdAt,
      }));

    // ---- Sales performance — last 6 months, from confirmed Bookings ----
    const monthBuckets: { key: string; label: string; revenue: number; profit: number }[] = [];
    for (let i = SALES_PERFORMANCE_MONTHS - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      monthBuckets.push({ key: monthKey(d), label: monthLabel(d), revenue: 0, profit: 0 });
    }
    const bucketByKey = new Map(monthBuckets.map((b) => [b.key, b]));
    for (const booking of confirmedBookings) {
      const bucket = bucketByKey.get(monthKey(new Date(booking.createdAt)));
      if (!bucket) continue; // outside the 6-month window
      bucket.revenue += booking.sellingTotal;
      bucket.profit += booking.profit;
    }

    return {
      todaysQueries,
      pendingQuotations,
      confirmedQuotations,
      upcomingTrips,
      monthlyRevenue,
      monthlyProfit,
      topDestinations,
      popularHotels,
      recentActivity,
      salesPerformance: monthBuckets.map(({ label, revenue, profit }) => ({ month: label, revenue, profit })),
    };
  }
}

function describeAuditEntry(action: string, entityType: string, entityId?: string, details?: string): string {
  const subject = details || entityId || entityType;
  switch (action) {
    case "create": return `${entityType} created: ${subject}`;
    case "update": return `${entityType} updated: ${subject}`;
    case "delete": return `${entityType} deleted: ${subject}`;
    case "send": return `${entityType} sent: ${subject}`;
    case "export": return `${entityType} exported: ${subject}`;
    default: return `${entityType}: ${subject}`;
  }
}
