"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createRateItemAction, type RateItemInput } from "./actions";
import type { RateSheetCategory } from "@/types/domain";

const INPUT = "w-full rounded-xl border px-3 py-2 text-sm outline-none";
const LABEL = "block text-xs font-medium mb-1.5";

export function AddRateItemForm({ category }: { category: RateSheetCategory }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPvt = category.serviceMode === "PVT";

  const [name, setName] = useState("");
  const [service, setService] = useState("");
  const [description, setDescription] = useState("");
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<string>("");
  const [slots, setSlots] = useState("");
  const [distance, setDistance] = useState("");
  const [startTime, setStartTime] = useState("");
  const [daySchedule, setDaySchedule] = useState("");
  const [seasonLabel, setSeasonLabel] = useState("1 Jan 2026 - 31 Dec 2026");
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(category.priceColumns.map((c) => [c.id, ""]))
  );

  function reset() {
    setName(""); setService(""); setDescription("");
    setOpenTime(""); setCloseTime(""); setDurationMinutes(""); setSlots("");
    setDistance(""); setStartTime(""); setDaySchedule("");
    setSeasonLabel("1 Jan 2026 - 31 Dec 2026");
    setPrices(Object.fromEntries(category.priceColumns.map((c) => [c.id, ""])));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const input: RateItemInput = {
      categoryId: category.id,
      name,
      service,
      description: description || undefined,
      ...(isPvt
        ? { distance: distance || undefined, startTime: startTime || undefined, daySchedule: daySchedule || undefined }
        : { openTime: openTime || undefined, closeTime: closeTime || undefined, slots: slots || undefined }),
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      seasons: [
        {
          id: "season_1",
          label: seasonLabel,
          prices: Object.fromEntries(category.priceColumns.map((c) => [c.id, Number(prices[c.id]) || 0])),
        },
      ],
    };

    const result = await createRateItemAction(input);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    reset();
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2 rounded-xl"
        style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
      >
        <Plus size={15} /> Add Rate to {category.name}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Name</label>
          <input required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={name} onChange={(e) => setName(e.target.value)} placeholder="Hanoi City Tour - Full Day" />
        </div>
        <div>
          <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Service</label>
          <input required className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={service} onChange={(e) => setService(e.target.value)} placeholder={isPvt ? "PVT" : "Tickets"} />
        </div>
      </div>

      <div>
        <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Description</label>
        <textarea className={INPUT} style={{ borderColor: "var(--color-border)" }} rows={2}
          value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {isPvt ? (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Distance</label>
            <input className={INPUT} style={{ borderColor: "var(--color-border)" }}
              value={distance} onChange={(e) => setDistance(e.target.value)} />
          </div>
          <div>
            <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Start Time</label>
            <input className={INPUT} style={{ borderColor: "var(--color-border)" }}
              value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div>
            <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Duration (mins)</label>
            <input type="number" min={0} className={INPUT} style={{ borderColor: "var(--color-border)" }}
              value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
          </div>
          <div className="col-span-3">
            <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Day Schedule</label>
            <textarea className={INPUT} style={{ borderColor: "var(--color-border)" }} rows={2}
              value={daySchedule} onChange={(e) => setDaySchedule(e.target.value)} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Open Time</label>
            <input className={INPUT} style={{ borderColor: "var(--color-border)" }}
              value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
          </div>
          <div>
            <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Close Time</label>
            <input className={INPUT} style={{ borderColor: "var(--color-border)" }}
              value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
          </div>
          <div>
            <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Duration (Min)</label>
            <input type="number" min={0} className={INPUT} style={{ borderColor: "var(--color-border)" }}
              value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
          </div>
          <div>
            <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Slots</label>
            <input className={INPUT} style={{ borderColor: "var(--color-border)" }}
              value={slots} onChange={(e) => setSlots(e.target.value)} />
          </div>
        </div>
      )}

      <div className="rounded-xl p-4" style={{ border: "1px solid var(--color-border)" }}>
        <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Season</label>
        <input className={`${INPUT} mb-3`} style={{ borderColor: "var(--color-border)" }}
          value={seasonLabel} onChange={(e) => setSeasonLabel(e.target.value)} placeholder="1 Jan 2026 - 31 Dec 2026" />

        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(category.priceColumns.length, 4)}, minmax(0, 1fr))` }}>
          {category.priceColumns.map((col) => (
            <div key={col.id}>
              <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>{col.label} ($)</label>
              <input type="number" min={0} className={INPUT} style={{ borderColor: "var(--color-border)" }}
                value={prices[col.id] ?? ""} onChange={(e) => setPrices((p) => ({ ...p, [col.id]: e.target.value }))} />
            </div>
          ))}
        </div>
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
          {submitting ? "Saving…" : "Save Rate"}
        </button>
      </div>
    </form>
  );
}
