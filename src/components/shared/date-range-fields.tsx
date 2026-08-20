"use client";

const INPUT = "w-full rounded-xl border px-3 py-2 text-sm outline-none";
const LABEL = "block text-xs font-medium mb-1.5";

function daysBetween(from: string, to: string): number | null {
  if (!from || !to) return null;
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : null;
}

/** "Available From" / "Available To" date pickers plus a computed day count — the rate-validity window for a Hotel/Transport/Activity inventory record. */
export function DateRangeFields({
  from,
  to,
  onFromChange,
  onToChange,
  label = "Rate Validity (optional)",
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  label?: string;
}) {
  const days = daysBetween(from, to);

  return (
    <div>
      <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>{label}</label>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] mb-1 block" style={{ color: "var(--color-text-muted)" }}>Available From</label>
          <input type="date" className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={from} onChange={(e) => onFromChange(e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] mb-1 block" style={{ color: "var(--color-text-muted)" }}>Available To</label>
          <input type="date" className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={to} onChange={(e) => onToChange(e.target.value)} />
        </div>
      </div>
      {days !== null && (
        <p className="text-[11px] mt-1.5" style={{ color: "var(--color-text-secondary)" }}>
          Valid for {days} {days === 1 ? "day" : "days"}
        </p>
      )}
    </div>
  );
}
