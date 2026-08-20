"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Quotation, PricingBreakdown, TravelQuery, Hotel, TransportItem, ActivityItem } from "@/types/domain";
import { formatCurrency } from "@/lib/currency";
import {
  addHotelLineAction, removeHotelLineAction,
  addTransportLineAction, removeTransportLineAction,
  addActivityLineAction, removeActivityLineAction,
  updatePricingInputsAction, updateInternalCommentsAction, updateQuotationStatusAction, confirmBookingAction,
} from "./actions";
import {
  recordMessageDraftAction, listSentHistoryAction,
} from "./send-actions";
import { format } from "date-fns";
import { Trash2, FileText, FileSpreadsheet, Send, CheckCircle2, Copy, Mail, MessageCircle } from "lucide-react";

const TABS = ["Basic Details", "Hotels", "Transport", "Activities", "Pricing", "Internal Comments", "Documents"] as const;
type Tab = (typeof TABS)[number];

const CARD = "card-surface p-6";
const INPUT = "w-full rounded-xl border px-3 py-2 text-sm outline-none";

export function QuotationBuilder({
  initialQuotation, initialPricing, query, hotels, transportItems, activities, canSeeCost, canSeePricing,
  canManageBookings,
}: {
  initialQuotation: Quotation;
  initialPricing: PricingBreakdown;
  query: TravelQuery;
  hotels: Hotel[];
  transportItems: TransportItem[];
  activities: ActivityItem[];
  canSeeCost: boolean;
  canSeePricing: boolean;
  canManageBookings: boolean;
}) {
  const [tab, setTab] = useState<Tab>("Basic Details");
  const [quotation, setQuotation] = useState(initialQuotation);
  const [pricing, setPricing] = useState(initialPricing);

  function applyResult(result: { quotation: Quotation; pricing: PricingBreakdown }) {
    setQuotation(result.quotation);
    setPricing(result.pricing);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">{quotation.id}</h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {quotation.packageName} package for {query.guestName || query.contactPerson}
          </p>
        </div>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
          style={{ background: "var(--color-teal-100)", color: "var(--color-teal-700)" }}>
          {quotation.status}
        </span>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="text-sm font-medium px-3.5 py-2 rounded-xl whitespace-nowrap transition-colors"
            style={tab === t
              ? { background: "var(--color-teal-600)", color: "#fff" }
              : { color: "var(--color-text-secondary)" }}
          >
            {t}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {tab === "Basic Details" && <BasicDetailsTab query={query} quotation={quotation} />}
        {tab === "Hotels" && (
          <HotelsTab quotation={quotation} hotels={hotels} canSeeCost={canSeeCost} onChange={applyResult} />
        )}
        {tab === "Transport" && (
          <TransportTab quotation={quotation} items={transportItems} canSeeCost={canSeeCost} onChange={applyResult} />
        )}
        {tab === "Activities" && (
          <ActivitiesTab quotation={quotation} items={activities} canSeeCost={canSeeCost} onChange={applyResult} />
        )}
        {tab === "Pricing" && (
          <PricingTab quotation={quotation} pricing={pricing} canSeePricing={canSeePricing} onChange={applyResult} />
        )}
        {tab === "Internal Comments" && <InternalCommentsTab quotation={quotation} />}
        {tab === "Documents" && (
          <DocumentsTab
            quotation={quotation}
            query={query}
            pricing={pricing}
            canManageBookings={canManageBookings}
            onStatusChange={setQuotation}
          />
        )}
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function BasicDetailsTab({ query, quotation }: { query: TravelQuery; quotation: Quotation }) {
  return (
    <div className={CARD}>
      <h2 className="text-sm font-semibold mb-4">Basic Details</h2>
      <div className="grid grid-cols-4 gap-4 text-xs">
        <Field label="Destination" value={query.destination} />
        <Field label="Travel Date" value={format(new Date(query.travelDate), "d MMM yyyy")} />
        <Field label="Duration" value={`${query.numberOfNights} Nights, ${query.numberOfNights + 1} Days`} />
        <Field label="Pax" value={`${query.adults} Adults${query.children ? `, ${query.children} Children` : ""}`} />
        <Field label="Guest" value={query.guestName || query.contactPerson} />
        <Field label="Phone" value={query.phoneNumber || "—"} />
        <Field label="Package" value={quotation.packageName} />
        <Field label="Status" value={quotation.status} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: "var(--color-text-muted)" }} className="uppercase text-[10px] mb-0.5">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function HotelsTab({
  quotation, hotels, canSeeCost, onChange,
}: {
  quotation: Quotation;
  hotels: Hotel[];
  canSeeCost: boolean;
  onChange: (r: { quotation: Quotation; pricing: PricingBreakdown }) => void;
}) {
  const [hotelId, setHotelId] = useState("");
  const [nights, setNights] = useState(1);
  const [rooms, setRooms] = useState(1);
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (!hotelId) return;
    setBusy(true);
    const result = await addHotelLineAction(quotation.id, hotelId, nights, rooms);
    setBusy(false);
    onChange(result);
    setHotelId("");
  }

  async function handleRemove(lineId: string) {
    const result = await removeHotelLineAction(quotation.id, lineId);
    onChange(result);
  }

  return (
    <div className={CARD}>
      <h2 className="text-sm font-semibold mb-4">Hotels</h2>

      <div className="grid grid-cols-5 gap-3 mb-4 items-end">
        <div className="col-span-2">
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-secondary)" }}>Hotel</label>
          <select className={INPUT} style={{ borderColor: "var(--color-border)" }} value={hotelId} onChange={(e) => setHotelId(e.target.value)}>
            <option value="">Select from inventory...</option>
            {hotels.map((h) => <option key={h.id} value={h.id}>{h.name} — {h.city} ({h.starRating}★)</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-secondary)" }}>Nights</label>
          <input type="number" min={1} className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={nights} onChange={(e) => setNights(Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-secondary)" }}>Rooms</label>
          <input type="number" min={1} className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={rooms} onChange={(e) => setRooms(Number(e.target.value))} />
        </div>
        <button onClick={handleAdd} disabled={!hotelId || busy}
          className="text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-50"
          style={{ background: "var(--color-teal-600)" }}>
          Add
        </button>
      </div>

      <LineTable
        rows={quotation.hotelLines.map((l) => ({
          id: l.id,
          label: `${l.hotelName} (${l.city})`,
          meta: `${l.nights} nights × ${l.rooms} room(s)`,
          cost: l.costPrice,
          selling: l.sellingPrice,
        }))}
        canSeeCost={canSeeCost}
        onRemove={handleRemove}
        emptyLabel="No hotels added yet."
      />
    </div>
  );
}

function TransportTab({
  quotation, items, canSeeCost, onChange,
}: {
  quotation: Quotation;
  items: TransportItem[];
  canSeeCost: boolean;
  onChange: (r: { quotation: Quotation; pricing: PricingBreakdown }) => void;
}) {
  const [transportId, setTransportId] = useState("");
  const [day, setDay] = useState(1);
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (!transportId) return;
    setBusy(true);
    const result = await addTransportLineAction(quotation.id, transportId, day);
    setBusy(false);
    onChange(result);
    setTransportId("");
  }

  async function handleRemove(lineId: string) {
    onChange(await removeTransportLineAction(quotation.id, lineId));
  }

  return (
    <div className={CARD}>
      <h2 className="text-sm font-semibold mb-4">Transport</h2>

      <div className="grid grid-cols-4 gap-3 mb-4 items-end">
        <div className="col-span-2">
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-secondary)" }}>Vehicle</label>
          <select className={INPUT} style={{ borderColor: "var(--color-border)" }} value={transportId} onChange={(e) => setTransportId(e.target.value)}>
            <option value="">Select from inventory...</option>
            {items.map((t) => <option key={t.id} value={t.id}>{t.vehicleType} — {t.pickup} → {t.drop}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-secondary)" }}>Day</label>
          <input type="number" min={1} className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={day} onChange={(e) => setDay(Number(e.target.value))} />
        </div>
        <button onClick={handleAdd} disabled={!transportId || busy}
          className="text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-50"
          style={{ background: "var(--color-teal-600)" }}>
          Add
        </button>
      </div>

      <LineTable
        rows={quotation.transportLines.map((l) => ({
          id: l.id, label: l.vehicleType, meta: `Day ${l.day}`, cost: l.costPrice, selling: l.sellingPrice,
        }))}
        canSeeCost={canSeeCost}
        onRemove={handleRemove}
        emptyLabel="No transport added yet."
      />
    </div>
  );
}

function ActivitiesTab({
  quotation, items, canSeeCost, onChange,
}: {
  quotation: Quotation;
  items: ActivityItem[];
  canSeeCost: boolean;
  onChange: (r: { quotation: Quotation; pricing: PricingBreakdown }) => void;
}) {
  const [activityId, setActivityId] = useState("");
  const [day, setDay] = useState(1);
  const [pax, setPax] = useState(2);
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (!activityId) return;
    setBusy(true);
    const result = await addActivityLineAction(quotation.id, activityId, day, pax);
    setBusy(false);
    onChange(result);
    setActivityId("");
  }

  async function handleRemove(lineId: string) {
    onChange(await removeActivityLineAction(quotation.id, lineId));
  }

  return (
    <div className={CARD}>
      <h2 className="text-sm font-semibold mb-4">Activities</h2>

      <div className="grid grid-cols-5 gap-3 mb-4 items-end">
        <div className="col-span-2">
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-secondary)" }}>Activity</label>
          <select className={INPUT} style={{ borderColor: "var(--color-border)" }} value={activityId} onChange={(e) => setActivityId(e.target.value)}>
            <option value="">Select from inventory...</option>
            {items.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.city}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-secondary)" }}>Day</label>
          <input type="number" min={1} className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={day} onChange={(e) => setDay(Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-secondary)" }}>Pax</label>
          <input type="number" min={1} className={INPUT} style={{ borderColor: "var(--color-border)" }}
            value={pax} onChange={(e) => setPax(Number(e.target.value))} />
        </div>
        <button onClick={handleAdd} disabled={!activityId || busy}
          className="text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-50"
          style={{ background: "var(--color-teal-600)" }}>
          Add
        </button>
      </div>

      <LineTable
        rows={quotation.activityLines.map((l) => ({
          id: l.id, label: l.activityName, meta: `Day ${l.day} · ${l.pax} pax`, cost: l.costPrice, selling: l.sellingPrice,
        }))}
        canSeeCost={canSeeCost}
        onRemove={handleRemove}
        emptyLabel="No activities added yet."
      />
    </div>
  );
}

function LineTable({
  rows, canSeeCost, onRemove, emptyLabel,
}: {
  rows: { id: string; label: string; meta: string; cost: number; selling: number }[];
  canSeeCost: boolean;
  onRemove: (id: string) => void;
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-center py-6" style={{ color: "var(--color-text-muted)" }}>{emptyLabel}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
            <th className="py-2 font-medium">Item</th>
            {canSeeCost && <th className="py-2 font-medium">Cost</th>}
            <th className="py-2 font-medium">Selling</th>
            <th className="py-2 font-medium w-8"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
              <td className="py-2.5">
                <div className="font-medium">{r.label}</div>
                <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{r.meta}</div>
              </td>
              {canSeeCost && <td className="py-2.5">{formatCurrency(r.cost)}</td>}
              <td className="py-2.5 font-medium">{formatCurrency(r.selling)}</td>
              <td className="py-2.5">
                <button onClick={() => onRemove(r.id)} style={{ color: "var(--color-text-muted)" }}>
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------

function PricingTab({
  quotation, pricing, canSeePricing, onChange,
}: {
  quotation: Quotation;
  pricing: PricingBreakdown;
  canSeePricing: boolean;
  onChange: (r: { quotation: Quotation; pricing: PricingBreakdown }) => void;
}) {
  const [markup, setMarkup] = useState(quotation.markupPercent);
  const [discount, setDiscount] = useState(quotation.discountPercent);
  const [gst, setGst] = useState(quotation.gstPercent);

  async function commit(next: { markupPercent?: number; discountPercent?: number; gstPercent?: number }) {
    onChange(await updatePricingInputsAction(quotation.id, next));
  }

  return (
    <div className={CARD}>
      <h2 className="text-sm font-semibold mb-4">Pricing</h2>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3 text-sm">
          <Row label="Hotel Total" value={pricing.hotelTotal} />
          <Row label="Transport Total" value={pricing.transportTotal} />
          <Row label="Activities Total" value={pricing.activitiesTotal} />
          {canSeePricing && <Row label="Cost Total" value={pricing.costTotal} strong />}
          <Row label="Selling Subtotal" value={pricing.sellingSubtotal} />

          <div className="pt-3 space-y-3" style={{ borderTop: "1px solid var(--color-border)" }}>
            <PercentRow label="Markup %" value={markup} onChange={setMarkup} onBlur={() => commit({ markupPercent: markup })} />
            <PercentRow label="Discount %" value={discount} onChange={setDiscount} onBlur={() => commit({ discountPercent: discount })} />
            <PercentRow label="GST %" value={gst} onChange={setGst} onBlur={() => commit({ gstPercent: gst })} />
          </div>
        </div>

        <div className="rounded-2xl p-5" style={{ background: "var(--color-teal-100)" }}>
          <div className="text-xs font-medium mb-1" style={{ color: "var(--color-teal-700)" }}>Final Selling Price</div>
          <div className="text-2xl font-bold mb-4" style={{ color: "var(--color-teal-700)" }}>
            {formatCurrency(pricing.finalSellingPrice)}
          </div>
          {canSeePricing && (
            <>
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: "#475467" }}>Profit</span>
                <span className="font-medium" style={{ color: "var(--color-emerald-600)" }}>{formatCurrency(pricing.profit)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "#475467" }}>Margin</span>
                <span className="font-medium" style={{ color: "var(--color-teal-700)" }}>{pricing.margin.toFixed(1)}%</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
      <span className={strong ? "font-semibold" : ""}>{formatCurrency(value)}</span>
    </div>
  );
}

function PercentRow({
  label, value, onChange, onBlur,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onBlur: () => void;
}) {
  return (
    <div className="flex justify-between items-center">
      <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
      <input
        type="number"
        className="w-20 rounded-lg border px-2 py-1 text-sm text-right"
        style={{ borderColor: "var(--color-border)" }}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onBlur={onBlur}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function InternalCommentsTab({ quotation }: { quotation: Quotation }) {
  const [comments, setComments] = useState(quotation.internalComments ?? "");
  const [saved, setSaved] = useState(false);

  async function handleBlur() {
    await updateInternalCommentsAction(quotation.id, comments);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className={CARD}>
      <h2 className="text-sm font-semibold mb-1">Internal Comments</h2>
      <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
        Staff-only — never included in the customer PDF, email, or WhatsApp send.
      </p>
      <textarea
        className={INPUT}
        style={{ borderColor: "var(--color-border)" }}
        rows={6}
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        onBlur={handleBlur}
        placeholder="e.g. Customer negotiating on price, follow up Thursday..."
      />
      {saved && <p className="text-xs mt-2" style={{ color: "var(--color-emerald-600)" }}>Saved.</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------

function DocumentsTab({
  quotation, query, pricing, canManageBookings, onStatusChange,
}: {
  quotation: Quotation;
  query: TravelQuery;
  pricing: PricingBreakdown;
  canManageBookings: boolean;
  onStatusChange: (q: Quotation) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<{ ok: boolean; message: string; bookingId?: string } | null>(null);

  async function markReady() {
    setBusy(true);
    const updated = await updateQuotationStatusAction(quotation.id, "Ready");
    setBusy(false);
    onStatusChange(updated);
  }

  async function markSent() {
    setBusy(true);
    const updated = await updateQuotationStatusAction(quotation.id, "Sent");
    setBusy(false);
    onStatusChange(updated);
  }

  async function confirmBooking() {
    setConfirming(true);
    setConfirmResult(null);
    const result = await confirmBookingAction(quotation.id);
    setConfirming(false);
    if (!result.ok) {
      setConfirmResult({ ok: false, message: result.error });
      return;
    }
    onStatusChange(result.quotation);
    setConfirmResult({ ok: true, message: `Booking ${result.booking.id} created.`, bookingId: result.booking.id });
  }

  return (
    <div className="space-y-4">
      <div className={CARD}>
        <h2 className="text-sm font-semibold mb-1">Documents</h2>
        <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
          Generate the customer-facing PDF and draft an email or WhatsApp message to go with it —
          drafting only, nothing is sent from here; copy it or open your own mail/WhatsApp to send it.
          Supplier cost, profit, margin, and internal comments never appear in the PDF or in any draft.
        </p>

        <div className="flex gap-3 flex-wrap">
          <a
            href={`/api/quotations/${quotation.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            <FileText size={14} /> Download PDF
          </a>
          <a
            href={`/api/quotations/${quotation.id}/excel`}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            <FileSpreadsheet size={14} /> Download Excel
          </a>
          <button
            onClick={markReady}
            disabled={busy || quotation.status !== "Draft"}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-50"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            Mark Ready
          </button>
          <button
            onClick={markSent}
            disabled={busy || quotation.status === "Sent"}
            className="inline-flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-50"
            style={{ background: "var(--color-teal-600)" }}
          >
            <Send size={14} /> Mark Sent
          </button>
          {canManageBookings && (
            <button
              onClick={confirmBooking}
              disabled={confirming || quotation.status === "Accepted"}
              className="inline-flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, var(--color-emerald-600), var(--color-teal-600))" }}
            >
              <CheckCircle2 size={14} />
              {quotation.status === "Accepted" ? "Booking Confirmed" : confirming ? "Confirming…" : "Confirm Booking"}
            </button>
          )}
        </div>

        {confirmResult && (
          <div
            className="mt-3 text-sm px-3 py-2 rounded-xl flex items-center justify-between"
            style={confirmResult.ok
              ? { background: "var(--color-emerald-100)", color: "var(--color-emerald-600)" }
              : { background: "#FEF2F2", color: "#B91C1C" }}
          >
            <span>{confirmResult.message}</span>
            {confirmResult.ok && confirmResult.bookingId && (
              <a href={`/bookings/${confirmResult.bookingId}`} className="font-medium underline">View Booking</a>
            )}
          </div>
        )}
      </div>

      <DraftMessagePanel quotationId={quotation.id} query={query} pricing={pricing} />
      <SentHistoryPanel quotationId={quotation.id} />
    </div>
  );
}

function DraftMessagePanel({ quotationId, query, pricing }: { quotationId: string; query: TravelQuery; pricing: PricingBreakdown }) {
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  // Auto-filled from the query's Guest Email so staff don't have to re-type or
  // copy-paste it in — still editable in case the quotation should go to a
  // different address (a travel agent, a second traveler, etc.).
  const [email, setEmail] = useState(query.guestEmail ?? "");
  const [phone, setPhone] = useState(query.phoneNumber ?? "");
  const [subject, setSubject] = useState(`Your Vietnam DMC quotation ${quotationId}`);
  const [message, setMessage] = useState(
    `Hi ${query.guestName || query.contactPerson},\n\n` +
      "Please find your travel quotation below.\n\n" +
      `Package Total: {PRICE} (for ${query.adults} Adult${query.adults === 1 ? "" : "s"}` +
      `${query.children ? ` + ${query.children} Child${query.children === 1 ? "" : "ren"}` : ""}, ` +
      `${query.numberOfNights} Night${query.numberOfNights === 1 ? "" : "s"})\n\n` +
      "Full itinerary and pricing breakdown:\n{PDF_LINK}\n\n" +
      "Let us know if you'd like any changes.\n\nBest,\nVietnam DMC"
  );
  const [logging, setLogging] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function pdfLink(): string {
    return typeof window !== "undefined" ? `${window.location.origin}/api/quotations/${quotationId}/pdf` : "";
  }

  function composedBody(): string {
    return message.replace("{PDF_LINK}", pdfLink()).replace("{PRICE}", formatCurrency(pricing.finalSellingPrice));
  }

  async function logDraft(recipients: string[]) {
    setLogging(true);
    const outcome = await recordMessageDraftAction({ quotationId, channel, recipients });
    setLogging(false);
    setResult(outcome.ok ? { ok: true, message: "Draft logged in Sent History." } : { ok: false, message: outcome.error ?? "Could not log draft." });
  }

  async function handleCopy() {
    setResult(null);
    const recipient = channel === "email" ? email.trim() : phone.trim();
    if (!recipient) {
      setResult({ ok: false, message: `Add ${channel === "email" ? "a recipient email" : "a phone number"} first.` });
      return;
    }
    const text = channel === "email" ? `Subject: ${subject}\n\n${composedBody()}` : composedBody();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard access can fail (permissions, non-HTTPS) — the draft is still logged below.
    }
    await logDraft([recipient]);
  }

  async function handleOpen() {
    setResult(null);
    if (channel === "email") {
      if (!email.trim()) {
        setResult({ ok: false, message: "Add a recipient email first." });
        return;
      }
      window.location.href = `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(composedBody())}`;
      await logDraft([email.trim()]);
    } else {
      if (!phone.trim()) {
        setResult({ ok: false, message: "Add a phone number first." });
        return;
      }
      const digits = phone.replace(/[^\d]/g, "");
      window.open(`https://wa.me/${digits}?text=${encodeURIComponent(composedBody())}`, "_blank", "noopener,noreferrer");
      await logDraft([phone.trim()]);
    }
  }

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h2 className="text-sm font-semibold">Draft a Message</h2>
        <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
          <button
            onClick={() => setChannel("email")}
            className="px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5"
            style={channel === "email" ? { background: "var(--color-teal-600)", color: "white" } : { color: "var(--color-text-secondary)" }}
          >
            <Mail size={13} /> Email
          </button>
          <button
            onClick={() => setChannel("whatsapp")}
            className="px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5"
            style={channel === "whatsapp" ? { background: "var(--color-emerald-600)", color: "white" } : { color: "var(--color-text-secondary)" }}
          >
            <MessageCircle size={13} /> WhatsApp
          </button>
        </div>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
        Composes the message here — the app never sends it. Copy it, or open it directly in your own
        {channel === "email" ? " mail app" : " WhatsApp"} to send it yourself.
      </p>

      <div className="space-y-3">
        {channel === "email" ? (
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-secondary)" }}>Recipient Email</label>
            <input className={INPUT} style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} placeholder="guest@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            {query.guestEmail ? (
              <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>Auto-filled from the query's Guest Email — edit if this quotation should go elsewhere.</p>
            ) : (
              <p className="text-[11px] mt-1" style={{ color: "#B45309" }}>No Guest Email is on file for this query — add one on the query to auto-fill this next time.</p>
            )}
          </div>
        ) : (
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-secondary)" }}>WhatsApp Number</label>
            <input className={INPUT} style={{ borderColor: "var(--color-border)" }} placeholder="919876543210 (with country code, no +)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        )}

        {channel === "email" && (
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-secondary)" }}>Subject</label>
            <input className={INPUT} style={{ borderColor: "var(--color-border)" }} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
        )}

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-secondary)" }}>Message</label>
          <textarea
            className={INPUT}
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)", fontSize: "13px", lineHeight: 1.6 }}
            rows={9}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
            {"{PRICE}"} is replaced with the package total ({formatCurrency(pricing.finalSellingPrice)}) and {"{PDF_LINK}"} with the
            quotation PDF link when you copy or open the message.
          </p>
        </div>

        {result && (
          <p className="text-xs" style={{ color: result.ok ? "var(--color-emerald-600)" : "#DC2626" }}>{result.message}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={handleCopy}
            disabled={logging}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-50"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            <Copy size={14} /> Copy Message
          </button>
          <button
            onClick={handleOpen}
            disabled={logging}
            className="inline-flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-50"
            style={{ background: channel === "email" ? "var(--color-teal-600)" : "var(--color-emerald-600)" }}
          >
            {channel === "email" ? <Mail size={14} /> : <MessageCircle size={14} />}
            {channel === "email" ? "Open in Mail" : "Open WhatsApp"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SentHistoryPanel({ quotationId }: { quotationId: string }) {
  const [history, setHistory] = useState<Awaited<ReturnType<typeof listSentHistoryAction>> | null>(null);

  useEffect(() => {
    listSentHistoryAction(quotationId).then(setHistory);
  }, [quotationId]);

  if (!history) return null;

  return (
    <div className={CARD}>
      <h2 className="text-sm font-semibold mb-3">Message Drafts</h2>
      {history.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Nothing drafted yet.</p>
      ) : (
        <div className="space-y-2">
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between text-sm py-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <div>
                <span className="font-medium capitalize">{h.channel}</span>
                <span style={{ color: "var(--color-text-muted)" }}> → {h.recipients.join(", ")}</span>
              </div>
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: "var(--color-teal-100)", color: "var(--color-teal-700)" }}
              >
                Drafted
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
