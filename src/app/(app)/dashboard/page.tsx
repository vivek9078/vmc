import Link from "next/link";
import { statsRepository, queryRepository } from "@/lib/repositories";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { BentoCard } from "@/components/dashboard/bento-card";
import { AnimatedCounter } from "@/components/dashboard/animated-counter";
import { SalesPerformanceChart } from "@/components/dashboard/sales-performance-chart";
import { formatDistanceToNow } from "date-fns";
import {
  FileClock, CheckCircle2, PlaneTakeoff, TrendingUp, MapPin, Hotel as HotelIcon,
  Activity, Zap, Sparkles,
} from "lucide-react";

export default async function DashboardPage() {
  const [stats, recentQueries, { permissions }] = await Promise.all([
    statsRepository.getDashboardStats(),
    queryRepository.list(),
    requireAuth(),
  ]);
  const canSeeFinancials = hasPermission(permissions, "quotation.view_pricing");
  const topDestinationMax = stats.topDestinations[0]?.count ?? 0;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            Overview of queries, quotations, and performance.
          </p>
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BentoCard delay={0}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>Today&apos;s Inquiries</span>
            <Sparkles size={15} style={{ color: "var(--color-teal-600)" }} />
          </div>
          <div className="text-2xl font-bold"><AnimatedCounter value={stats.todaysQueries} /></div>
        </BentoCard>

        <BentoCard delay={0.03}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>Pending Quotations</span>
            <FileClock size={15} style={{ color: "var(--color-ocean-500)" }} />
          </div>
          <div className="text-2xl font-bold"><AnimatedCounter value={stats.pendingQuotations} /></div>
        </BentoCard>

        <BentoCard delay={0.06}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>Confirmed Quotations</span>
            <CheckCircle2 size={15} style={{ color: "var(--color-emerald-600)" }} />
          </div>
          <div className="text-2xl font-bold"><AnimatedCounter value={stats.confirmedQuotations} /></div>
        </BentoCard>

        <BentoCard delay={0.09}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>Upcoming Trips</span>
            <PlaneTakeoff size={15} style={{ color: "var(--color-teal-600)" }} />
          </div>
          <div className="text-2xl font-bold"><AnimatedCounter value={stats.upcomingTrips} /></div>
        </BentoCard>

        {/* Revenue + Profit — wide, hidden from roles without pricing visibility */}
        {canSeeFinancials && (
          <BentoCard delay={0.12} className="sm:col-span-2 lg:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>Monthly Revenue</span>
              <TrendingUp size={15} style={{ color: "var(--color-teal-600)" }} />
            </div>
            <div className="text-2xl font-bold mb-4">
              $<AnimatedCounter value={stats.monthlyRevenue} formatAsCurrency />
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>Monthly Profit</span>
            </div>
            <div className="text-lg font-semibold" style={{ color: "var(--color-emerald-600)" }}>
              $<AnimatedCounter value={stats.monthlyProfit} formatAsCurrency />
            </div>
          </BentoCard>
        )}

        {/* Sales performance chart — wide */}
        <BentoCard delay={0.15} className="sm:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>Sales Performance</span>
          </div>
          <SalesPerformanceChart data={stats.salesPerformance} />
        </BentoCard>

        {/* Top destinations */}
        <BentoCard delay={0.18} className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={15} style={{ color: "var(--color-teal-600)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>Top Destinations</span>
          </div>
          <div className="space-y-2">
            {stats.topDestinations.length === 0 && (
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No inquiries yet.</p>
            )}
            {stats.topDestinations.map((d) => (
              <div key={d.name} className="flex items-center gap-3">
                <span className="text-sm flex-1">{d.name}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${topDestinationMax > 0 ? (d.count / topDestinationMax) * 100 : 0}%`,
                      background: "linear-gradient(90deg, var(--color-teal-600), var(--color-emerald-600))",
                    }}
                  />
                </div>
                <span className="text-xs font-medium w-6 text-right" style={{ color: "var(--color-text-muted)" }}>{d.count}</span>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* Popular hotels */}
        <BentoCard delay={0.21} className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <HotelIcon size={15} style={{ color: "var(--color-ocean-500)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>Popular Hotels</span>
          </div>
          <div className="space-y-2.5">
            {stats.popularHotels.length === 0 && (
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No quotations yet.</p>
            )}
            {stats.popularHotels.map((h) => (
              <div key={h.name} className="flex items-center justify-between text-sm">
                <span>{h.name}</span>
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: "var(--color-teal-100)", color: "var(--color-teal-700)" }}
                >
                  {h.count} quotes
                </span>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* Recent activity */}
        <BentoCard delay={0.24} className="sm:col-span-2 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={15} style={{ color: "var(--color-teal-600)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>Recent Activity</span>
          </div>
          <div className="space-y-3">
            {stats.recentActivity.length === 0 && (
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Nothing yet — activity will show up here as the team works.</p>
            )}
            {stats.recentActivity.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--color-text-primary)" }}>{a.label}</span>
                <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                  {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* Quick actions */}
        <BentoCard delay={0.27} className="sm:col-span-2 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={15} style={{ color: "var(--color-emerald-600)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>Quick Actions</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/queries/new" className="text-sm px-3 py-2.5 rounded-xl text-center transition-colors"
              style={{ background: "var(--color-teal-100)", color: "var(--color-teal-700)", fontWeight: 500 }}>
              + New Inquiry
            </Link>
            <Link href="/hotels" className="text-sm px-3 py-2.5 rounded-xl text-center transition-colors"
              style={{ background: "var(--color-ocean-100)", color: "var(--color-ocean-700)", fontWeight: 500 }}>
              Manage Hotels
            </Link>
            <Link href="/reports" className="text-sm px-3 py-2.5 rounded-xl text-center transition-colors"
              style={{ background: "var(--color-emerald-100)", color: "var(--color-teal-700)", fontWeight: 500 }}>
              View Reports
            </Link>
            <Link href="/suppliers" className="text-sm px-3 py-2.5 rounded-xl text-center transition-colors"
              style={{ background: "var(--color-bg)", color: "var(--color-text-secondary)", fontWeight: 500, border: "1px solid var(--color-border)" }}>
              Suppliers
            </Link>
          </div>
        </BentoCard>

        {/* Recent quotes list */}
        <BentoCard delay={0.3} className="sm:col-span-2 lg:col-span-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>Recent Quotes</span>
            <Link href="/queries" className="text-xs font-medium" style={{ color: "var(--color-teal-600)" }}>View all</Link>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {recentQueries.length === 0 && (
              <p className="text-sm py-3" style={{ color: "var(--color-text-muted)" }}>No inquiries yet — start with New Inquiry above.</p>
            )}
            {recentQueries.slice(0, 5).map((q) => (
              <Link
                key={q.id}
                href={`/queries/${q.id}`}
                className="flex items-center justify-between py-3 text-sm hover:opacity-70 transition-opacity"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium" style={{ color: "var(--color-teal-700)" }}>{q.id}</span>
                  <span style={{ color: "var(--color-text-primary)" }}>{q.guestName || q.contactPerson}</span>
                  <span style={{ color: "var(--color-text-muted)" }}>{q.destination}</span>
                </div>
                <span
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{ background: "var(--color-teal-100)", color: "var(--color-teal-700)" }}
                >
                  {q.status}
                </span>
              </Link>
            ))}
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
