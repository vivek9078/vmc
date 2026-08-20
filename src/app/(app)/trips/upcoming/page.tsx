import { queryRepository } from "@/lib/repositories";
import { format } from "date-fns";
import Link from "next/link";

export default async function UpcomingTripsPage() {
  const all = await queryRepository.list({ status: "Confirmed" });
  const upcoming = all.filter((q) => new Date(q.travelDate) >= new Date(new Date().toDateString()));

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Upcoming Trips</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          Confirmed queries with a travel date still ahead.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {upcoming.length === 0 && (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No upcoming confirmed trips yet.</p>
        )}
        {upcoming.map((q) => (
          <Link key={q.id} href={`/queries/${q.id}`} className="card-surface p-5 block">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm" style={{ color: "var(--color-teal-700)" }}>{q.id}</span>
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                style={{ background: "var(--color-emerald-100)", color: "var(--color-emerald-600)" }}>
                Confirmed
              </span>
            </div>
            <p className="text-sm font-medium">{q.guestName || q.contactPerson}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {q.destination} · {format(new Date(q.travelDate), "d MMM yyyy")} · {q.numberOfNights}N
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
