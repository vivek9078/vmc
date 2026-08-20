"use client";

import { useState } from "react";
import { extractQueryFromTextAction } from "./intake-actions";
import { DraftReview } from "./draft-review";
import type { ExtractionResult } from "@/lib/queryExtraction";
import type { QuerySourceType } from "@/types/domain";

const INPUT = "w-full rounded-xl border px-3 py-2 text-sm outline-none transition-shadow focus:shadow-[var(--glow-teal)]";

export function WhatsAppTextForm({ onBack }: { onBack: () => void }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ result: ExtractionResult; originalInputText: string; sourceType: QuerySourceType } | null>(null);

  async function handleExtract() {
    setSubmitting(true);
    setError(null);
    const res = await extractQueryFromTextAction(text);
    setSubmitting(false);
    if (!res.ok || !res.result) {
      setError(res.error ?? "Could not process that text.");
      return;
    }
    setDraft({ result: res.result, originalInputText: res.originalInputText ?? text, sourceType: res.sourceType ?? "WhatsApp/Text" });
  }

  if (draft) {
    return <DraftReview result={draft.result} originalInputText={draft.originalInputText} sourceType={draft.sourceType} />;
  }

  return (
    <div className="card-surface p-6 max-w-2xl">
      <h2 className="text-sm font-semibold mb-1">WhatsApp / Text</h2>
      <p className="text-xs mb-4" style={{ color: "var(--color-text-secondary)" }}>
        Paste a message copied from WhatsApp, email, or any other text source. No message is sent anywhere — this only reads what you paste here.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder={'e.g. "Need Vietnam package for 6 adults for 7 days 6 nights. Hanoi 3 nights and Halong Bay 2 nights. 4 star hotel. Airport pickup required."'}
        className={INPUT}
        style={{ borderColor: "var(--color-border)" }}
      />
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mt-3">{error}</p>}
      <div className="flex justify-between items-center mt-4">
        <button type="button" onClick={onBack} className="text-sm font-medium px-4 py-2.5 rounded-xl" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
          Back
        </button>
        <button
          type="button"
          disabled={submitting || !text.trim()}
          onClick={handleExtract}
          className="text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-transform hover:scale-[1.02] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
        >
          {submitting ? "Extracting…" : "Extract Query"}
        </button>
      </div>
    </div>
  );
}
