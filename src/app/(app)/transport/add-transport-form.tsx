"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createTransportAction, type TransportInput } from "./actions";
import { DateRangeFields } from "@/components/shared/date-range-fields";
import type { Supplier } from "@/types/domain";

const INPUT = "w-full rounded-xl border px-3 py-2 text-sm outline-none";
const LABEL = "block text-xs font-medium mb-1.5";

export function AddTransportForm({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<TransportInput>>({ capacity: 4 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof TransportInput>(key: K, value: TransportInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await createTransportAction(form as TransportInput);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setForm({ capacity: 4 });
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2 rounded-xl"
        style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
      >
        <Plus size={15} /> Add Vehicle
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface p-6 space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Vehicle Type</label>
          <input required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.vehicleType ?? ""} onChange={(e) => update("vehicleType", e.target.value)} placeholder="4 Seater Sedan" />
        </div>
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Capacity (pax)</label>
          <input type="number" min={1} required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.capacity ?? 4} onChange={(e) => update("capacity", Number(e.target.value))} />
        </div>
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Supplier</label>
          <select required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.supplierId ?? ""} onChange={(e) => update("supplierId", e.target.value)}>
            <option value="">Select supplier...</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Pickup</label>
          <input required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.pickup ?? ""} onChange={(e) => update("pickup", e.target.value)} placeholder="Noi Bai Airport" />
        </div>
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Drop</label>
          <input required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.drop ?? ""} onChange={(e) => update("drop", e.target.value)} placeholder="Hanoi Old Quarter" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Cost ($)</label>
          <input type="number" min={0} required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.cost ?? ""} onChange={(e) => update("cost", Number(e.target.value))} />
        </div>
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Selling Price ($)</label>
          <input type="number" min={0} required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.selling ?? ""} onChange={(e) => update("selling", Number(e.target.value))} />
        </div>
      </div>

      <DateRangeFields
        from={form.availableFrom ?? ""}
        to={form.availableTo ?? ""}
        onFromChange={(v) => update("availableFrom", v)}
        onToChange={(v) => update("availableTo", v)}
      />

      <div>
        <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Remarks</label>
        <textarea className={INPUT} style={{ borderColor: "var(--color-border)" }} rows={2}
          value={form.remarks ?? ""} onChange={(e) => update("remarks", e.target.value)} />
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
          {submitting ? "Saving…" : "Save Vehicle"}
        </button>
      </div>
    </form>
  );
}
