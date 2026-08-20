import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { bookingRepository, paymentRepository } from "@/lib/repositories";
import { formatCurrency } from "@/lib/currency";
import type { BookingStatus } from "@/types/domain";
import type { CSSProperties } from "react";

const STATUS_COLORS: Record<BookingStatus, CSSProperties> = {
  Confirmed: { backgroundColor: "var(--color-emerald-100)", color: "var(--color-emerald-600)" },
  Completed: { backgroundColor: "var(--color-ocean-100)", color: "var(--color-ocean-700)" },
  Cancelled: { backgroundColor: "#FEF2F2", color: "#B91C1C" },
};

export default async function BookingsPage() {
  const { permissions } = await requireAuth();
  if (!hasPermission(permissions, "booking.view")) redirect("/dashboard");

  const canSeeProfit = hasPermission(permissions, "quotation.view_pricing");

  const [bookings, payments] = await Promise.all([bookingRepository.list(), paymentRepository.list()]);

  const receivedByBooking = new Map<string, number>();
  for (const p of payments) {
    if (p.direction !== "Received") continue;
    receivedByBooking.set(p.bookingId, (receivedByBooking.get(p.bookingId) ?? 0) + p.amount);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Bookings</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          {bookings.length === 0
            ? "No bookings yet — confirm a quotation from its Documents tab to create one."
            : `${bookings.length} bookings`}
        </p>
      </div>

      {bookings.length > 0 && (
        <div className="card-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Booking</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Guest</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Destination</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Travel Date</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Total</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Payment</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const received = receivedByBooking.get(b.id) ?? 0;
                const paymentStatus = received <= 0 ? "Unpaid" : received >= b.sellingTotal ? "Fully Paid" : "Partial";
                const paymentColor: CSSProperties = paymentStatus === "Fully Paid"
                  ? { backgroundColor: "var(--color-emerald-100)", color: "var(--color-emerald-600)" }
                  : paymentStatus === "Partial"
                    ? { backgroundColor: "#FEF3C7", color: "#92400E" }
                    : { backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" };
                return (
                  <tr key={b.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td className="px-4 py-2.5">
                      <Link href={`/bookings/${b.id}`} className="font-medium" style={{ color: "var(--color-teal-700)" }}>{b.id}</Link>
                    </td>
                    <td className="px-4 py-2.5">{b.guestName}</td>
                    <td className="px-4 py-2.5" style={{ color: "var(--color-text-secondary)" }}>{b.destination}</td>
                    <td className="px-4 py-2.5" style={{ color: "var(--color-text-secondary)" }}>{new Date(b.travelDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {canSeeProfit ? formatCurrency(b.sellingTotal) : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[11px] px-1.5 py-0.5 rounded" style={paymentColor}>{paymentStatus}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[11px] px-1.5 py-0.5 rounded" style={STATUS_COLORS[b.status]}>{b.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
