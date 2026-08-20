"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/currency";
import { PaymentForm } from "../payment-form";
import { updateBookingStatusAction } from "../actions";
import type { Booking, Payment, BookingStatus } from "@/types/domain";
import type { CSSProperties } from "react";

const STATUS_COLORS: Record<BookingStatus, CSSProperties> = {
  Confirmed: { backgroundColor: "var(--color-emerald-100)", color: "var(--color-emerald-600)" },
  Completed: { backgroundColor: "var(--color-ocean-100)", color: "var(--color-ocean-700)" },
  Cancelled: { backgroundColor: "#FEF2F2", color: "#B91C1C" },
};

export function BookingDetail({
  booking,
  payments,
  canRecordPayments,
  canManageBooking,
  canSeeProfit,
}: {
  booking: Booking;
  payments: Payment[];
  canRecordPayments: boolean;
  canManageBooking: boolean;
  canSeeProfit: boolean;
}) {
  const router = useRouter();
  const [statusBusy, setStatusBusy] = useState(false);

  const received = payments.filter((p) => p.direction === "Received").reduce((s, p) => s + p.amount, 0);
  const paidOut = payments.filter((p) => p.direction === "Paid").reduce((s, p) => s + p.amount, 0);
  const balanceDue = booking.sellingTotal - received;

  async function changeStatus(status: BookingStatus) {
    setStatusBusy(true);
    await updateBookingStatusAction(booking.id, status);
    setStatusBusy(false);
    router.refresh();
  }

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        <div className="card-surface p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold">{booking.guestName}</h2>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {booking.destination} · {booking.packageName} · {booking.numberOfNights} nights
              </p>
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={STATUS_COLORS[booking.status]}>
              {booking.status}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-[11px] uppercase" style={{ color: "var(--color-text-muted)" }}>Selling Total</div>
              <div className="font-semibold">{formatCurrency(booking.sellingTotal)}</div>
            </div>
            {canSeeProfit && (
              <div>
                <div className="text-[11px] uppercase" style={{ color: "var(--color-text-muted)" }}>Profit</div>
                <div className="font-semibold" style={{ color: "var(--color-emerald-600)" }}>{formatCurrency(booking.profit)}</div>
              </div>
            )}
            <div>
              <div className="text-[11px] uppercase" style={{ color: "var(--color-text-muted)" }}>Travel Date</div>
              <div className="font-semibold">{new Date(booking.travelDate).toLocaleDateString()}</div>
            </div>
          </div>

          {canManageBooking && booking.status === "Confirmed" && (
            <div className="flex gap-2 mt-4">
              <button onClick={() => changeStatus("Completed")} disabled={statusBusy}
                className="text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                style={{ background: "var(--color-ocean-100)", color: "var(--color-ocean-700)" }}>
                Mark Completed
              </button>
              <button onClick={() => changeStatus("Cancelled")} disabled={statusBusy}
                className="text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                style={{ background: "#FEF2F2", color: "#B91C1C" }}>
                Cancel Booking
              </button>
            </div>
          )}
        </div>

        <div className="card-surface p-5">
          <h2 className="text-sm font-semibold mb-3">Payment History</h2>
          {payments.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No payments recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th className="text-left py-2 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Date</th>
                  <th className="text-left py-2 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Direction</th>
                  <th className="text-left py-2 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Method</th>
                  <th className="text-right py-2 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td className="py-2">{new Date(p.paidAt).toLocaleDateString()}</td>
                    <td className="py-2">
                      <span className="text-[11px] px-1.5 py-0.5 rounded" style={p.direction === "Received"
                        ? { background: "var(--color-emerald-100)", color: "var(--color-emerald-600)" }
                        : { background: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        {p.direction}
                      </span>
                    </td>
                    <td className="py-2" style={{ color: "var(--color-text-secondary)" }}>{p.method}{p.reference ? ` · ${p.reference}` : ""}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div className="card-surface p-5">
          <h2 className="text-sm font-semibold mb-3">Balance</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: "var(--color-text-secondary)" }}>Received</span>
              <span className="font-medium">{formatCurrency(received)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--color-text-secondary)" }}>Paid to suppliers</span>
              <span className="font-medium">{formatCurrency(paidOut)}</span>
            </div>
            <div className="flex justify-between pt-2" style={{ borderTop: "1px solid var(--color-border)" }}>
              <span style={{ color: "var(--color-text-secondary)" }}>Balance due</span>
              <span className="font-semibold" style={{ color: balanceDue > 0 ? "#B91C1C" : "var(--color-emerald-600)" }}>
                {formatCurrency(Math.max(balanceDue, 0))}
              </span>
            </div>
          </div>
        </div>

        {canRecordPayments && (
          <div className="card-surface p-5">
            <h2 className="text-sm font-semibold mb-3">Record Payment</h2>
            <PaymentForm bookingId={booking.id} onRecorded={() => router.refresh()} />
          </div>
        )}
      </div>
    </div>
  );
}
