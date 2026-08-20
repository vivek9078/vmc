"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";
import { approveQueryDraftAction } from "./intake-actions";
import type { ExtractionResult, ExtractedQueryFields, FieldStatus } from "@/lib/queryExtraction";
import type { QuerySourceType } from "@/types/domain";

const CARD = "card-surface p-6";
const LABEL = "block text-xs font-medium mb-1.5";
const INPUT = "w-full rounded-xl border px-3 py-2 text-sm outline-none transition-shadow focus:shadow-[var(--glow-teal)]";

function StatusBadge({ status }: { status?: FieldStatus }) {
  const s = status ?? "Not Detected";
  const style: Record<FieldStatus, { bg: string; fg: string; icon: typeof CheckCircle2 }> = {
    "Detected": { bg: "var(--color-emerald-100)", fg: "var(--color-emerald-600)", icon: CheckCircle2 },
    "User Confirmed": { bg: "var(--color-teal-100)", fg: "var(--color-teal-700)", icon: CheckCircle2 },
    "Needs Review": { bg: "#FEF3C7", fg: "#92400E", icon: AlertCircle },
    "Not Detected": { bg: "var(--color-border)", fg: "var(--color-text-secondary)", icon: HelpCircle },
  };
  const { bg, fg, icon: Icon } = style[s];
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
      style={{ background: bg, color: fg }}
    >
      <Icon size={10} /> {s}
    </span>
  );
}

function Field({
  label, status, children,
}: { label: string; status?: FieldStatus; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className={LABEL + " mb-0"} style={{ color: "var(--color-text-secondary)" }}>{label}</label>
        <StatusBadge status={status} />
      </div>
      {children}
    </div>
  );
}

export function DraftReview({
  result, originalInputText, sourceType, uploadedFileName,
}: {
  result: ExtractionResult;
  originalInputText: string;
  sourceType: QuerySourceType;
  uploadedFileName?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Local editable copy — editing a field promotes its status to "User
  // Confirmed" so the reviewer can see at a glance what they've touched.
  const [fields, setFields] = useState<ExtractedQueryFields>(result.fields);
  const [status, setStatus] = useState(result.status);
  const [contactPerson, setContactPerson] = useState(fields.guestName ?? "");
  const [querySource, setQuerySource] = useState(sourceType === "WhatsApp/Text" ? "WhatsApp" : sourceType);
  const [activitiesText, setActivitiesText] = useState((fields.activitiesList ?? []).join(", "));

  function set<K extends keyof ExtractedQueryFields>(key: K, value: ExtractedQueryFields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
    setStatus((s) => ({ ...s, [key]: "User Confirmed" }));
  }

  async function handleApprove() {
    setSubmitting(true);
    setServerError(null);
    setFieldErrors({});

    const approveResult = await approveQueryDraftAction({
      contactPerson,
      querySource,
      destination: fields.destination ?? "",
      travelDate: fields.travelDate,
      numberOfNights: fields.numberOfNights,
      adults: fields.adults ?? 1,
      children: fields.children,
      infants: fields.infants,
      rooms: fields.rooms,
      departureDate: fields.departureDate,
      durationDays: fields.durationDays,
      hotelCategory: fields.hotelCategory,
      mealPlan: fields.mealPlan,
      transportPreference: fields.transportPreference,
      airportTransfer: fields.airportTransfer,
      activitiesList: activitiesText ? activitiesText.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      budgetAmount: fields.budgetAmount,
      budgetCurrency: fields.budgetCurrency,
      destinationBreakdown: fields.destinationBreakdown ? JSON.stringify(fields.destinationBreakdown) : undefined,
      guestName: fields.guestName,
      guestEmail: fields.guestEmail,
      phoneNumber: fields.phoneNumber,
      specialNotes: fields.specialNotes,
      sourceType,
      sourceLanguage: result.sourceLanguage,
      originalInputText,
      extractionStatusJson: JSON.stringify(status),
      uploadedFileName,
    });

    setSubmitting(false);
    if (!approveResult.ok) {
      setServerError(approveResult.error ?? "Something went wrong.");
      setFieldErrors(approveResult.fieldErrors ?? {});
      return;
    }
    router.push(`/queries/${approveResult.queryId}`);
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* LEFT — original input, preserved verbatim */}
      <div className={CARD}>
        <h2 className="text-sm font-semibold mb-1">Original Input</h2>
        <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
          Source: {sourceType}{uploadedFileName ? ` · ${uploadedFileName}` : ""} · Language: {result.sourceLanguage}
        </p>
        <pre className="text-xs whitespace-pre-wrap rounded-xl p-3 max-h-[480px] overflow-y-auto" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", fontFamily: "inherit" }}>
          {originalInputText}
        </pre>
        {result.needsReview && (
          <p className="text-xs mt-3 flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: "#FEF3C7", color: "#92400E" }}>
            <AlertCircle size={13} className="shrink-0" />
            Some information could not be automatically interpreted. Please review manually.
          </p>
        )}
      </div>

      {/* RIGHT — extracted, editable fields */}
      <div className={CARD}>
        <h2 className="text-sm font-semibold mb-4">Extracted Query</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Contact Person *</label>
              <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className={INPUT} style={{ borderColor: "var(--color-border)" }} />
              {fieldErrors.contactPerson && <p className="text-xs text-red-500 mt-1">{fieldErrors.contactPerson[0]}</p>}
            </div>
            <div>
              <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Inquiry Source</label>
              <input value={querySource} onChange={(e) => setQuerySource(e.target.value)} className={INPUT} style={{ borderColor: "var(--color-border)" }} />
            </div>
          </div>

          <Field label="Destination" status={status.destination}>
            <input value={fields.destination ?? ""} onChange={(e) => set("destination", e.target.value)} className={INPUT} style={{ borderColor: "var(--color-border)" }} placeholder="e.g. Hanoi + Halong Bay" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Arrival Date" status={status.travelDate}>
              <input type="date" value={fields.travelDate ?? ""} onChange={(e) => set("travelDate", e.target.value)} className={INPUT} style={{ borderColor: "var(--color-border)" }} />
            </Field>
            <Field label="Departure Date" status={status.departureDate}>
              <input type="date" value={fields.departureDate ?? ""} onChange={(e) => set("departureDate", e.target.value)} className={INPUT} style={{ borderColor: "var(--color-border)" }} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration (Days)" status={status.durationDays}>
              <input type="number" min={0} value={fields.durationDays ?? ""} onChange={(e) => set("durationDays", e.target.value ? Number(e.target.value) : undefined)} className={INPUT} style={{ borderColor: "var(--color-border)" }} />
            </Field>
            <Field label="Nights" status={status.numberOfNights}>
              <input type="number" min={0} value={fields.numberOfNights ?? ""} onChange={(e) => set("numberOfNights", e.target.value ? Number(e.target.value) : undefined)} className={INPUT} style={{ borderColor: "var(--color-border)" }} />
            </Field>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <Field label="Adults" status={status.adults}>
              <input type="number" min={1} value={fields.adults ?? ""} onChange={(e) => set("adults", e.target.value ? Number(e.target.value) : undefined)} className={INPUT} style={{ borderColor: "var(--color-border)" }} />
            </Field>
            <Field label="Children" status={status.children}>
              <input type="number" min={0} value={fields.children ?? ""} onChange={(e) => set("children", e.target.value ? Number(e.target.value) : undefined)} className={INPUT} style={{ borderColor: "var(--color-border)" }} />
            </Field>
            <Field label="Infants" status={status.infants}>
              <input type="number" min={0} value={fields.infants ?? ""} onChange={(e) => set("infants", e.target.value ? Number(e.target.value) : undefined)} className={INPUT} style={{ borderColor: "var(--color-border)" }} />
            </Field>
            <Field label="Rooms" status={status.rooms}>
              <input type="number" min={0} value={fields.rooms ?? ""} onChange={(e) => set("rooms", e.target.value ? Number(e.target.value) : undefined)} className={INPUT} style={{ borderColor: "var(--color-border)" }} />
            </Field>
          </div>
          {fieldErrors.adults && <p className="text-xs text-red-500">{fieldErrors.adults[0]}</p>}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Hotel Category" status={status.hotelCategory}>
              <input value={fields.hotelCategory ?? ""} onChange={(e) => set("hotelCategory", e.target.value)} className={INPUT} style={{ borderColor: "var(--color-border)" }} placeholder="e.g. 4 or Luxury" />
            </Field>
            <Field label="Meal Plan" status={status.mealPlan}>
              <input value={fields.mealPlan ?? ""} onChange={(e) => set("mealPlan", e.target.value)} className={INPUT} style={{ borderColor: "var(--color-border)" }} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <Field label="Transport" status={status.transportPreference}>
              <input value={fields.transportPreference ?? ""} onChange={(e) => set("transportPreference", e.target.value)} className={INPUT} style={{ borderColor: "var(--color-border)" }} />
            </Field>
            <label className="flex items-center gap-2 text-sm pb-2.5">
              <input type="checkbox" checked={fields.airportTransfer ?? false} onChange={(e) => set("airportTransfer", e.target.checked)} />
              Airport Transfer Required
              <StatusBadge status={status.airportTransfer} />
            </label>
          </div>

          <Field label="Activities" status={status.activitiesList}>
            <input value={activitiesText} onChange={(e) => setActivitiesText(e.target.value)} className={INPUT} style={{ borderColor: "var(--color-border)" }} placeholder="Comma-separated" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Budget Amount" status={status.budgetAmount}>
              <input type="number" min={0} value={fields.budgetAmount ?? ""} onChange={(e) => set("budgetAmount", e.target.value ? Number(e.target.value) : undefined)} className={INPUT} style={{ borderColor: "var(--color-border)" }} />
            </Field>
            <Field label="Currency" status={status.budgetCurrency}>
              <input value={fields.budgetCurrency ?? ""} onChange={(e) => set("budgetCurrency", e.target.value)} className={INPUT} style={{ borderColor: "var(--color-border)" }} placeholder="e.g. USD" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Guest Email" status={status.guestEmail}>
              <input type="email" value={fields.guestEmail ?? ""} onChange={(e) => set("guestEmail", e.target.value)} className={INPUT} style={{ borderColor: "var(--color-border)" }} />
            </Field>
            <Field label="Phone Number" status={status.phoneNumber}>
              <input value={fields.phoneNumber ?? ""} onChange={(e) => set("phoneNumber", e.target.value)} className={INPUT} style={{ borderColor: "var(--color-border)" }} />
            </Field>
          </div>

          <Field label="Special Notes / Requirements" status={status.specialNotes}>
            <textarea value={fields.specialNotes ?? ""} onChange={(e) => set("specialNotes", e.target.value)} rows={3} className={INPUT} style={{ borderColor: "var(--color-border)" }} />
          </Field>

          {serverError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{serverError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.push("/queries/new")}
              className="text-sm font-medium px-4 py-2.5 rounded-xl"
              style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting || !contactPerson.trim() || !fields.destination?.trim()}
              onClick={handleApprove}
              className="text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-transform hover:scale-[1.02] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
            >
              {submitting ? "Approving…" : "Approve Query"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
