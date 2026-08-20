"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createActivityAction, type ActivityInput } from "./actions";
import { DateRangeFields } from "@/components/shared/date-range-fields";
import type { Supplier } from "@/types/domain";

const INPUT = "w-full rounded-xl border px-3 py-2 text-sm outline-none";
const LABEL = "block text-xs font-medium mb-1.5";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function AddActivityForm({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<ActivityInput>>({ operatingDays: [...DAYS] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof ActivityInput>(key: K, value: ActivityInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleDay(day: string) {
    setForm((f) => {
      const days = f.operatingDays ?? [];
      return { ...f, operatingDays: days.includes(day) ? days.filter((d) => d !== day) : [...days, day] };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await createActivityAction(form as ActivityInput);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setForm({ operatingDays: [...DAYS] });
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2 rounded-xl"
        style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
      >
        <Plus size={15} /> Add Activity
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface p-6 space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Activity Name</label>
          <input required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.name ?? ""} onChange={(e) => update("name", e.target.value)} placeholder="Halong Bay Deluxe Day Cruise" />
        </div>
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>City</label>
          <input required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.city ?? ""} onChange={(e) => update("city", e.target.value)} />
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

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Duration</label>
          <input required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.duration ?? ""} onChange={(e) => update("duration", e.target.value)} placeholder="8 hours" />
        </div>
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

      <div>
        <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Operating Days</label>
        <div className="flex gap-2 flex-wrap">
          {DAYS.map((day) => {
            const active = (form.operatingDays ?? []).includes(day);
            return (
              <button
                type="button"
                key={day}
                onClick={() => toggleDay(day)}
                className="text-xs font-medium px-3 py-1.5 rounded-full"
                style={active
                  ? { background: "var(--color-teal-100)", color: "var(--color-teal-700)" }
                  : { border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
              >
                {day}
              </button>
            );
          })}
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
          {submitting ? "Saving…" : "Save Activity"}
        </button>
      </div>
    </form>
  );
}
