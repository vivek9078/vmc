"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createSupplierAction, type SupplierInput } from "./actions";

const INPUT = "w-full rounded-xl border px-3 py-2 text-sm outline-none";
const LABEL = "block text-xs font-medium mb-1.5";

export function AddSupplierForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<SupplierInput>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof SupplierInput>(key: K, value: SupplierInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await createSupplierAction(form as SupplierInput);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setForm({});
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2 rounded-xl"
        style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
      >
        <Plus size={15} /> Add Supplier
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Supplier Name</label>
          <input required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.name ?? ""} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Company</label>
          <input required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.company ?? ""} onChange={(e) => update("company", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Phone</label>
          <input required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.phone ?? ""} onChange={(e) => update("phone", e.target.value)} />
        </div>
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Email</label>
          <input type="email" required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.email ?? ""} onChange={(e) => update("email", e.target.value)} />
        </div>
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Country</label>
          <input required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.country ?? ""} onChange={(e) => update("country", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Payment Terms</label>
          <input className={INPUT} style={{ borderColor: "var(--color-border)" }} placeholder="Net 30"
            value={form.paymentTerms ?? ""} onChange={(e) => update("paymentTerms", e.target.value)} />
        </div>
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>GST</label>
          <input className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={form.gst ?? ""} onChange={(e) => update("gst", e.target.value)} />
        </div>
      </div>

      <div>
        <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Bank Details</label>
        <textarea className={INPUT} style={{ borderColor: "var(--color-border)" }} rows={2}
          value={form.bankDetails ?? ""} onChange={(e) => update("bankDetails", e.target.value)} />
      </div>

      <div>
        <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Internal Notes</label>
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
          {submitting ? "Saving…" : "Save Supplier"}
        </button>
      </div>
    </form>
  );
}
