import Link from "next/link";
import { queryRepository } from "@/lib/repositories";
import type { QueryStatus } from "@/types/domain";
import { format } from "date-fns";

const STATUSES: QueryStatus[] = [
  "Draft", "Quotation Created", "Quotation Sent", "Confirmed", "Cancelled", "Completed", "Archived",
];

export default async function QueriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const queries = await queryRepository.list({ status: params.status, search: params.q });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Inquiries</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{queries.length} total</p>
        </div>
        <Link href="/queries/new" className="text-white text-sm font-medium px-4 py-2 rounded-xl"
          style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}>
          + New Inquiry
        </Link>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Link
          href="/queries"
          className="text-xs font-medium px-3 py-1.5 rounded-full"
          style={!params.status
            ? { background: "var(--color-teal-100)", color: "var(--color-teal-700)" }
            : { border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
        >
          All
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/queries?status=${encodeURIComponent(s)}`}
            className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={params.status === s
              ? { background: "var(--color-teal-100)", color: "var(--color-teal-700)" }
              : { border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
              <th className="px-5 py-3 font-medium">Inquiry ID</th>
              <th className="px-5 py-3 font-medium">Guest</th>
              <th className="px-5 py-3 font-medium">Destination</th>
              <th className="px-5 py-3 font-medium">Travel Date</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {queries.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center" style={{ color: "var(--color-text-muted)" }}>No queries match this view.</td></tr>
            )}
            {queries.map((q) => (
              <tr key={q.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td className="px-5 py-3">
                  <Link href={`/queries/${q.id}`} className="font-medium" style={{ color: "var(--color-teal-700)" }}>{q.id}</Link>
                </td>
                <td className="px-5 py-3">
                  <div>{q.guestName || q.contactPerson}</div>
                  <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{q.phoneNumber || "—"}</div>
                </td>
                <td className="px-5 py-3">{q.destination}</td>
                <td className="px-5 py-3">{format(new Date(q.travelDate), "d MMM yyyy")} · {q.numberOfNights}N</td>
                <td className="px-5 py-3">
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                    style={{ background: "var(--color-teal-100)", color: "var(--color-teal-700)" }}>
                    {q.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
