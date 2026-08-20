"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Plus } from "lucide-react";
import { createHotelAction, checkHotelDuplicateAction, type HotelInput } from "./actions";
import { DateRangeFields } from "@/components/shared/date-range-fields";
import type { Supplier } from "@/types/domain";

const INPUT = "w-full rounded-xl border px-3 py-2 text-sm outline-none";
const LABEL = "block text-xs font-medium mb-1.5";

export function AddHotelForm({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<HotelInput>>({ starRating: 5, roomTypes: [], mealPlans: [] });
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof HotelInput>(key: K, value: HotelInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function checkDuplicate() {
    if (!form.name || !form.city) return;
    const dupes = await checkHotelDuplicateAction(form.name, form.city);
    setDuplicateWarning(dupes.length > 0 ? `A hotel named "${form.name}" already exists in ${form.city}.` : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await createHotelAction(form as HotelInput);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setForm({ starRating: 5, roomTypes: [], mealPlans: [] });
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2 rounded-xl"
        style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
      >
        <Plus size={15} /> Add Hotel
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface p-6 space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Hotel Name</label>
          <input required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.name ?? ""} onBlur={checkDuplicate}
            onChange={(e) => update("name", e.target.value)} />
        </div>
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>City</label>
          <input required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.city ?? ""} onBlur={checkDuplicate}
            onChange={(e) => update("city", e.target.value)} />
        </div>
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Star Rating</label>
          <select className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.starRating ?? 5} onChange={(e) => update("starRating", Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} Star</option>)}
          </select>
        </div>
      </div>

      {duplicateWarning && (
        <div className="flex items-start gap-2 text-xs px-3 py-2.5 rounded-xl"
          style={{ background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A" }}>
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {duplicateWarning} You can still save it if this is intentional (e.g. a different property with the same name).
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Supplier</label>
          <select required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.supplierId ?? ""} onChange={(e) => update("supplierId", e.target.value)}>
            <option value="">Select supplier...</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Supplier Cost ($/night)</label>
          <input type="number" required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.supplierCost ?? ""} onChange={(e) => update("supplierCost", Number(e.target.value))} />
        </div>
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Selling Price ($/night)</label>
          <input type="number" required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.sellingCost ?? ""} onChange={(e) => update("sellingCost", Number(e.target.value))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Check-in Time</label>
          <input className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.checkInTime ?? ""} onChange={(e) => update("checkInTime", e.target.value)} placeholder="14:00" />
        </div>
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Check-out Time</label>
          <input className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.checkOutTime ?? ""} onChange={(e) => update("checkOutTime", e.target.value)} placeholder="12:00" />
        </div>
      </div>

      <DateRangeFields
        from={form.availableFrom ?? ""}
        to={form.availableTo ?? ""}
        onFromChange={(v) => update("availableFrom", v)}
        onToChange={(v) => update("availableTo", v)}
      />

      <div>
        <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Internal Notes (staff-only, never shown to customer)</label>
        <textarea className={INPUT} style={{ borderColor: "var(--color-border)" }} rows={2}
          value={form.internalNotes ?? ""} onChange={(e) => update("internalNotes", e.target.value)} />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)}
          className="text-sm font-medium px-4 py-2 rounded-xl" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
          Cancel
        </button>
        <button type="submit" disabled={submitting}
          className="text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}>
          {submitting ? "Saving…" : "Save Hotel"}
        </button>
      </div>
    </form>
  );
}
