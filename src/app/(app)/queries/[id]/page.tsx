import { notFound } from "next/navigation";
import Link from "next/link";
import { queryRepository, quotationRepository } from "@/lib/repositories";
import { format } from "date-fns";
import { CreateQuotationButton } from "./create-quotation-button";

export default async function QueryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [query, quotations] = await Promise.all([
    queryRepository.get(id),
    quotationRepository.listForQuery(id),
  ]);
  if (!query) notFound();

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="card-surface p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-bold">{query.id}</h1>
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                style={{ background: "var(--color-teal-100)", color: "var(--color-teal-700)" }}>
                {query.status}
              </span>
            </div>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {query.destination} · {format(new Date(query.travelDate), "d MMM yyyy")} · {query.numberOfNights} Nights · {query.adults} Adults
              {query.children ? `, ${query.children} Children` : ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 pt-4 text-xs" style={{ borderTop: "1px solid var(--color-border)" }}>
          <div>
            <div style={{ color: "var(--color-text-muted)" }}>Guest</div>
            <div className="font-medium mt-0.5">{query.guestName || query.contactPerson}</div>
          </div>
          <div>
            <div style={{ color: "var(--color-text-muted)" }}>Phone</div>
            <div className="font-medium mt-0.5">{query.phoneNumber || "—"}</div>
          </div>
          <div>
            <div style={{ color: "var(--color-text-muted)" }}>Email</div>
            <div className="font-medium mt-0.5">{query.guestEmail || "—"}</div>
          </div>
          <div>
            <div style={{ color: "var(--color-text-muted)" }}>Inquiry Source</div>
            <div className="font-medium mt-0.5">{query.querySource}</div>
          </div>
          <div>
            <div style={{ color: "var(--color-text-muted)" }}>Reference ID</div>
            <div className="font-medium mt-0.5">{query.referenceId ?? "—"}</div>
          </div>
        </div>

        {query.specialNotes && (
          <div className="mt-4 pt-4 text-xs" style={{ borderTop: "1px solid var(--color-border)" }}>
            <div style={{ color: "var(--color-text-muted)" }} className="mb-1">Special Notes</div>
            <p>{query.specialNotes}</p>
          </div>
        )}
      </div>

      {quotations.length > 0 && (
        <div className="card-surface p-6">
          <h2 className="text-sm font-semibold mb-3">Quotations</h2>
          <div className="space-y-2">
            {quotations.map((q) => (
              <Link
                key={q.id}
                href={`/queries/${id}/quotation/${q.id}`}
                className="flex items-center justify-between text-sm px-3 py-2.5 rounded-xl hover:opacity-70 transition-opacity"
                style={{ background: "var(--color-bg)" }}
              >
                <span className="font-medium">{q.id} · {q.packageName}</span>
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{ background: "var(--color-teal-100)", color: "var(--color-teal-700)" }}>
                  {q.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="card-surface p-6 text-center">
        <p className="text-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>
          Pick hotels, transport, and activities from inventory, then set markup / discount / GST
          — profit and margin are calculated automatically.
        </p>
        <CreateQuotationButton queryId={id} />
      </div>
    </div>
  );
}
