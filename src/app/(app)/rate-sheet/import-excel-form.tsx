"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, X, CheckCircle2, AlertTriangle, Link2 } from "lucide-react";
import { importRateSheetCsvAction, applyInventorySyncAction, type ImportSummary } from "./actions";
import { formatCurrency } from "@/lib/currency";
import type { SyncCandidate } from "@/lib/rateSheetSync";

export function ImportRateSheetForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [pending, setPending] = useState<SyncCandidate[]>([]);
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set());

  function candidateKey(c: SyncCandidate) {
    return `${c.entityType}:${c.entityId}:${c.rateItemId}`;
  }

  async function handleFiles(files: FileList) {
    const list = Array.from(files);
    setFileNames(list.map((f) => f.name));
    setUploading(true);
    setSummary(null);
    setPending([]);
    setAppliedKeys(new Set());
    const formData = new FormData();
    for (const file of list) formData.append("files", file);
    const result = await importRateSheetCsvAction(formData);
    setUploading(false);
    setSummary(result);
    if (result.ok) {
      setPending(result.suggestedMatches);
      router.refresh();
    }
  }

  async function applyCandidate(c: SyncCandidate) {
    setApplyingKey(candidateKey(c));
    const res = await applyInventorySyncAction([c]);
    setApplyingKey(null);
    if (res.ok) {
      setAppliedKeys((prev) => new Set(prev).add(candidateKey(c)));
      router.refresh();
    }
  }

  function reset() {
    setFileNames([]);
    setSummary(null);
    setPending([]);
    setAppliedKeys(new Set());
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl"
        style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
      >
        <UploadCloud size={15} /> Import from CSV
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[26rem] card-surface p-5 z-20 space-y-3 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Import Rate Sheet</h3>
            <button onClick={() => { setOpen(false); reset(); }} aria-label="Close">
              <X size={16} style={{ color: "var(--color-text-secondary)" }} />
            </button>
          </div>

          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Upload one or more <strong>.csv</strong> exports — one file per rate sheet tab/category. Each file&apos;s
            name becomes the category name. Each file needs a <strong>Name</strong> column, plus a{" "}
            <strong>Season</strong> block with a date range and price columns (pax or vehicle bands), same layout
            as a tab in your current master workbook. Re-uploading updates existing rows by name instead of
            duplicating them. Hotels/Transport/Activities already linked to a rate item update automatically; new
            name matches are shown below for you to confirm.
          </p>

          <label
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed py-6 cursor-pointer text-center"
            style={{ borderColor: "var(--color-border)" }}
          >
            <UploadCloud size={20} style={{ color: "var(--color-text-secondary)" }} />
            <span className="text-xs font-medium px-3">
              {fileNames.length > 0
                ? fileNames.length === 1
                  ? fileNames[0]
                  : `${fileNames.length} files selected`
                : "Click to choose .csv file(s)"}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) handleFiles(files);
              }}
            />
          </label>

          {uploading && (
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Reading and importing…</p>
          )}

          {summary && (
            <div
              className="rounded-xl p-3 text-xs space-y-1.5"
              style={{
                background: summary.ok ? "var(--color-emerald-100)" : "#fef2f2",
                color: summary.ok ? "var(--color-emerald-700)" : "#b91c1c",
              }}
            >
              <div className="flex items-center gap-1.5 font-medium">
                {summary.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                {summary.ok
                  ? `Imported ${summary.categoriesFound} categor${summary.categoriesFound === 1 ? "y" : "ies"} — ${summary.itemsCreated} new, ${summary.itemsUpdated} updated. ${summary.inventoryAutoUpdated} linked inventory price${summary.inventoryAutoUpdated === 1 ? "" : "s"} auto-updated.`
                  : summary.error}
              </div>
              {summary.warnings.length > 0 && (
                <ul className="list-disc pl-4 space-y-0.5 opacity-90">
                  {summary.warnings.slice(0, 6).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                  {summary.warnings.length > 6 && <li>+{summary.warnings.length - 6} more…</li>}
                </ul>
              )}
            </div>
          )}

          {pending.length > 0 && (
            <div className="rounded-xl p-3 space-y-2" style={{ background: "var(--color-amber-100, #fef3c7)" }}>
              <div className="text-xs font-medium" style={{ color: "var(--color-text-primary)" }}>
                {pending.length} possible match{pending.length === 1 ? "" : "es"} found — confirm to update &amp; link
              </div>
              <ul className="space-y-2">
                {pending.map((c) => {
                  const key = candidateKey(c);
                  const applied = appliedKeys.has(key);
                  return (
                    <li key={key} className="text-xs rounded-lg p-2 flex items-center justify-between gap-2" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{c.entityName}</div>
                        <div style={{ color: "var(--color-text-secondary)" }} className="truncate">
                          ← &quot;{c.rateItemName}&quot; · {formatCurrency(c.oldPrice)} → <strong>{formatCurrency(c.newPrice)}</strong>
                        </div>
                      </div>
                      <button
                        onClick={() => applyCandidate(c)}
                        disabled={applied || applyingKey === key}
                        className="shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                        style={{ border: "1px solid var(--color-border)", color: applied ? "var(--color-emerald-700)" : "var(--color-text-secondary)" }}
                      >
                        {applied ? <CheckCircle2 size={12} /> : <Link2 size={12} />}
                        {applied ? "Linked" : applyingKey === key ? "…" : "Link & Update"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => { setOpen(false); reset(); }}
              className="text-xs font-medium px-3 py-1.5 rounded-lg"
              style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
