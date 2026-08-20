"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentForm } from "../bookings/payment-form";
import { formatCurrency } from "@/lib/currency";
import type { Booking } from "@/types/domain";

export function RecordPaymentPanel({ bookings }: { bookings: Booking[] }) {
  const router = useRouter();
  const [bookingId, setBookingId] = useState("");

  return (
    <div className="card-surface p-5">
      <h2 className="text-sm font-semibold mb-3">Record Payment</h2>
      {bookings.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No bookings to record a payment against yet.</p>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Booking</label>
            <select
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-border)" }}
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
            >
              <option value="">Select a booking…</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>{b.id} — {b.guestName} ({formatCurrency(b.sellingTotal)})</option>
              ))}
            </select>
          </div>
          {bookingId && (
            <PaymentForm bookingId={bookingId} onRecorded={() => { setBookingId(""); router.refresh(); }} />
          )}
        </div>
      )}
    </div>
  );
}
