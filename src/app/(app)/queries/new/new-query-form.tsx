"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { createQuerySchema, VIETNAM_DESTINATIONS, type CreateQueryInput } from "@/lib/schemas/query";
import { createQueryAction } from "../actions";

const CARD = "card-surface p-6";
const LABEL = "block text-xs font-medium mb-1.5";
const INPUT =
  "w-full rounded-xl border px-3 py-2 text-sm outline-none transition-shadow focus:shadow-[var(--glow-teal)]";

const QUERY_SOURCES = ["Website", "WhatsApp", "Phone", "Email", "B2B Partner", "Travel Agent", "Walk-in", "Other"];

export function NewQueryForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateQueryInput>({
    resolver: zodResolver(createQuerySchema),
    defaultValues: {
      tags: [],
      numberOfNights: 1,
      adults: 1,
      children: 0,
    },
  });

  const nights = watch("numberOfNights") || 1;

  async function onSubmit(values: CreateQueryInput) {
    setSubmitting(true);
    setServerError(null);
    const result = await createQueryAction(values);
    setSubmitting(false);

    if (!result.ok) {
      setServerError(result.error ?? "Something went wrong.");
      return;
    }
    router.push(`/queries/${result.queryId}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={CARD}>
        <h2 className="text-sm font-semibold mb-4">Inquiry Source</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Inquiry Source</label>
            <input list="query-sources" {...register("querySource")}
              className={INPUT} style={{ borderColor: "var(--color-border)" }}
              placeholder="e.g. Website, WhatsApp, B2B Partner" />
            <datalist id="query-sources">
              {QUERY_SOURCES.map((s) => <option key={s} value={s} />)}
            </datalist>
            {errors.querySource && <p className="text-xs text-red-500 mt-1">{errors.querySource.message}</p>}
          </div>
          <div>
            <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Contact Person</label>
            <input {...register("contactPerson")} className={INPUT} style={{ borderColor: "var(--color-border)" }} />
            {errors.contactPerson && <p className="text-xs text-red-500 mt-1">{errors.contactPerson.message}</p>}
          </div>
          <div>
            <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Reference ID (optional)</label>
            <input {...register("referenceId")} className={INPUT} style={{ borderColor: "var(--color-border)" }} />
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className={CARD}>
        <h2 className="text-sm font-semibold mb-4">Destination and Duration</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Destination</label>
            <select {...register("destination")} defaultValue="" className={INPUT} style={{ borderColor: "var(--color-border)" }}>
              <option value="" disabled>Select a destination</option>
              {VIETNAM_DESTINATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {errors.destination && <p className="text-xs text-red-500 mt-1">{errors.destination.message}</p>}
          </div>
          <div>
            <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Travel Date</label>
            <input type="date" {...register("travelDate")} className={INPUT} style={{ borderColor: "var(--color-border)" }} />
            {errors.travelDate && <p className="text-xs text-red-500 mt-1">{String(errors.travelDate.message)}</p>}
          </div>
          <div>
            <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Number of Nights</label>
            <input type="number" min={1} {...register("numberOfNights", { valueAsNumber: true })}
              className={INPUT} style={{ borderColor: "var(--color-border)" }} />
            <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>{nights} Nights, {nights + 1} Days</p>
          </div>
          <div>
            <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Adults</label>
            <input type="number" min={1} {...register("adults", { valueAsNumber: true })}
              className={INPUT} style={{ borderColor: "var(--color-border)" }} />
          </div>
          <div>
            <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Children</label>
            <input type="number" min={0} {...register("children", { valueAsNumber: true })}
              className={INPUT} style={{ borderColor: "var(--color-border)" }} />
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={CARD}>
        <h2 className="text-sm font-semibold mb-4">Guest Details <span className="font-normal" style={{ color: "var(--color-text-muted)" }}>(optional)</span></h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Guest Name</label>
            <input {...register("guestName")} className={INPUT} style={{ borderColor: "var(--color-border)" }} />
            {errors.guestName && <p className="text-xs text-red-500 mt-1">{errors.guestName.message}</p>}
          </div>
          <div>
            <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Phone Number</label>
            <input
              {...register("phoneNumber")}
              type="tel"
              inputMode="tel"
              onKeyDown={(e) => {
                // Block letters as they're typed — allow digits, navigation/edit keys, and the phone punctuation the schema permits (+, -, space, parentheses).
                if (e.key.length === 1 && !/[0-9+\-\s()]/.test(e.key)) e.preventDefault();
              }}
              className={INPUT} style={{ borderColor: "var(--color-border)" }} placeholder="+84 98XXXXXXXX" />
            {errors.phoneNumber && <p className="text-xs text-red-500 mt-1">{errors.phoneNumber.message}</p>}
          </div>
          <div>
            <label className={LABEL} style={{ color: "var(--color-text-secondary)" }}>Guest Email</label>
            <input
              {...register("guestEmail")}
              type="email"
              className={INPUT} style={{ borderColor: "var(--color-border)" }} placeholder="guest@example.com" />
            <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
              Used to auto-fill the recipient when drafting a quotation email.
            </p>
            {errors.guestEmail && <p className="text-xs text-red-500 mt-1">{errors.guestEmail.message}</p>}
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className={CARD}>
        <h2 className="text-sm font-semibold mb-4">Special Notes</h2>
        <textarea {...register("specialNotes")} rows={3} className={INPUT} style={{ borderColor: "var(--color-border)" }}
          placeholder="Only 5 star hotels, honeymoon couple, etc." />
      </motion.div>

      {serverError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{serverError}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-transform hover:scale-[1.02] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
        >
          {submitting ? "Creating…" : "Create Inquiry"}
        </button>
      </div>
    </form>
  );
}
