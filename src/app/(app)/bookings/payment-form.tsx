"use client";

import { useState } from "react";
import { recordPaymentAction, type PaymentInput } from "./actions";

const INPUT = "w-full rounded-xl border px-3 py-2 text-sm outline-none";
const LABEL = "block text-xs font-medium mb-1.5";

const METHODS = ["Bank Transfer", "Card", "Cash", "UPI", "Other"] as const;

export function PaymentForm({ bookingId, onRecorded }: { bookingId: string; onRecorded: () => void }) {
  const [form, setForm] = useState<PaymentInput>({
    direction: "Received",
    amount: 0,
    method: "Bank Transfer",
    reference: "",
    notes: "",
    paidAt: new Date().toISOString().slice(0, 10),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await recordPaymentAction(bookingId, form);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Could not record payment.");
      return;
    }
    setForm({ direction: "Received", amount: 0, method: "Bank Transfer", reference: "", notes: "", paidAt: new Date().toISOString().slice(0, 10) });
    onRecorded();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Direction</label>
          <select className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.direction} onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value as PaymentInput["direction"] }))}>
            <option value="Received">Received (from customer)</option>
            <option value="Paid">Paid (to supplier)</option>
          </select>
        </div>
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Amount ($)</label>
          <input type="number" min={0.01} step="0.01" required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.amount || ""} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Method</label>
          <select className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as PaymentInput["method"] }))}>
            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Date</label>
          <input type="date" required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.paidAt} onChange={(e) => setForm((f) => ({ ...f, paidAt: e.target.value }))} />
        </div>
      </div>

      <div>
        <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Reference (optional)</label>
        <input className={INPUT} style={{ borderColor: "var(--color-border)" }} placeholder="Transaction ID, cheque no., etc."
          value={form.reference ?? ""} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
      </div>

      <div>
        <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Notes (optional)</label>
        <input className={INPUT} style={{ borderColor: "var(--color-border)" }}
          value={form.notes ?? ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      <button type="submit" disabled={submitting}
        className="w-full text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-60"
        style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}>
        {submitting ? "Recording…" : "Record Payment"}
      </button>
    </form>
  );
}
