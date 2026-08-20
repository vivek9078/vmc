"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, X, CheckCircle2, AlertTriangle, Loader2, Hotel, Bus, Ticket, PackagePlus } from "lucide-react";
import { previewCsvSyncAction, confirmCsvSyncAction, type PreviewResult, type ConfirmResult } from "./actions";
import type { SyncEntityType } from "@/types/domain";

const ENTITY_LABEL: Record<SyncEntityType, string> = { hotel: "Hotels", transport: "Transport", activity: "Activities", addon: "Add-ons" };
const ENTITY_ICON: Record<SyncEntityType, typeof Hotel> = { hotel: Hotel, transport: Bus, activity: Ticket, addon: PackagePlus };

function CountRow({ created, updated }: { created: Record<SyncEntityType, number>; updated: Record<SyncEntityType, number> }) {
  const types: SyncEntityType[] = ["hotel", "transport", "activity", "addon"];
  const visible = types.filter((t) => created[t] > 0 || updated[t] > 0);
  if (visible.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {visible.map((t) => {
        const Icon = ENTITY_ICON[t];
        return (
          <div key={t} className="rounded-xl p-3" style={{ border: "1px solid var(--color-border)" }}>
            <div className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>
              <Icon size={13} /> {ENTITY_LABEL[t]}
            </div>
            <div className="text-sm">
              <span className="font-semibold" style={{ color: "var(--color-emerald-700)" }}>+{created[t]} new</span>
              {updated[t] > 0 && <span style={{ color: "var(--color-text-secondary)" }}> · {updated[t]} updated</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CsvSyncForm({ expectedType, title, hint }: { expectedType?: SyncEntityType; title?: string; hint?: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"idle" | "previewing" | "confirming">("idle");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmResult | null>(null);

  async function handleFiles(files: FileList) {
    setBusy("previewing");
    setPreview(null);
    setConfirmed(null);
    const formData = new FormData();
    for (const file of Array.from(files)) formData.append("files", file);
    if (expectedType) formData.set("expectedType", expectedType);
    const result = await previewCsvSyncAction(formData);
    setBusy("idle");
    setPreview(result);
  }

  async function handleConfirm() {
    if (!preview?.pendingId) return;
    setBusy("confirming");
    const result = await confirmCsvSyncAction(preview.pendingId);
    setBusy("idle");
    setConfirmed(result);
    if (result.ok) router.refresh();
  }

  function reset() {
    setPreview(null);
    setConfirmed(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="card-surface p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title ?? "Upload CSV"}</h2>
        {(preview || confirmed) && (
          <button onClick={reset} className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            <X size={13} className="inline mr-1" /> Start over
          </button>
        )}
      </div>

      {!confirmed && (
        <label
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed py-8 cursor-pointer text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <UploadCloud size={22} style={{ color: "var(--color-text-secondary)" }} />
          <span className="text-sm font-medium px-3">
            {preview?.fileNames.length ? preview.fileNames.join(", ") : "Click to choose one or more .csv files"}
          </span>
          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {hint ?? "Any shape — hotels, transport (including per-vehicle price columns), activities, or add-ons. Up to 10MB per file."}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            multiple
            className="hidden"
            disabled={busy !== "idle"}
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) handleFiles(files);
            }}
          />
        </label>
      )}

      {busy === "previewing" && (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          <Loader2 size={14} className="animate-spin" /> Reading and matching against existing records…
        </div>
      )}

      {preview && !preview.ok && (
        <div className="rounded-xl p-3 text-sm flex items-center gap-2" style={{ background: "#fef2f2", color: "#b91c1c" }}>
          <AlertTriangle size={15} /> {preview.error}
        </div>
      )}

      {preview?.ok && !confirmed && (
        <div className="space-y-4">
          <div className="rounded-xl p-3 text-sm" style={{ background: "var(--color-surface)" }}>
            <strong>{preview.totalRows}</strong> rows read from {preview.fileNames.length} file{preview.fileNames.length === 1 ? "" : "s"}.
            {preview.skipped > 0 && <> {preview.skipped} row{preview.skipped === 1 ? "" : "s"} need review — see below.</>}
          </div>

          <CountRow created={preview.created} updated={preview.updated} />

          {preview.sample.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0" style={{ background: "var(--color-surface)" }}>
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Row</th>
                      <th className="text-left px-3 py-2 font-medium">Type</th>
                      <th className="text-left px-3 py-2 font-medium">Item</th>
                      <th className="text-left px-3 py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample.map((s, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: "var(--color-border)" }}>
                        <td className="px-3 py-1.5" style={{ color: "var(--color-text-secondary)" }}>{s.rowNumber}</td>
                        <td className="px-3 py-1.5">{ENTITY_LABEL[s.entityType]}</td>
                        <td className="px-3 py-1.5">{s.label}</td>
                        <td className="px-3 py-1.5">
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                            style={
                              s.action === "create"
                                ? { background: "var(--color-emerald-100)", color: "var(--color-emerald-700)" }
                                : { background: "var(--color-amber-100, #fef3c7)", color: "#92400e" }
                            }
                          >
                            {s.action === "create" ? "NEW" : "UPDATE"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.created.hotel + preview.created.transport + preview.created.activity + preview.created.addon
                + preview.updated.hotel + preview.updated.transport + preview.updated.activity + preview.updated.addon > preview.sample.length && (
                <div className="px-3 py-1.5 text-[11px] border-t" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                  Showing first {preview.sample.length} changes.
                </div>
              )}
            </div>
          )}

          {preview.errors.length > 0 && (
            <div className="rounded-xl p-3 text-xs space-y-1" style={{ background: "#fef2f2", color: "#b91c1c" }}>
              <div className="font-medium flex items-center gap-1.5"><AlertTriangle size={13} /> {preview.errors.length} row{preview.errors.length === 1 ? "" : "s"} need review</div>
              <ul className="list-disc pl-4 space-y-0.5">
                {preview.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>Row {e.rowNumber}: {e.message}</li>
                ))}
                {preview.errors.length > 10 && <li>+{preview.errors.length - 10} more…</li>}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={reset}
              className="text-sm font-medium px-4 py-2 rounded-xl"
              style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={busy === "confirming"}
              className="inline-flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
            >
              {busy === "confirming" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {busy === "confirming" ? "Syncing…" : "Confirm Import"}
            </button>
          </div>
        </div>
      )}

      {confirmed && (
        <div
          className="rounded-xl p-4 text-sm space-y-2"
          style={{
            background: confirmed.ok ? "var(--color-emerald-100)" : "#fef2f2",
            color: confirmed.ok ? "var(--color-emerald-700)" : "#b91c1c",
          }}
        >
          <div className="flex items-center gap-1.5 font-medium">
            {confirmed.ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            {confirmed.ok ? `Import complete — ${title ? title.replace(/^Upload /, "") : "records"} synced.` : confirmed.error}
          </div>
          {confirmed.ok && confirmed.batch && (
            <CountRow created={confirmed.batch.created} updated={confirmed.batch.updated} />
          )}
          {confirmed.ok && confirmed.batch && confirmed.batch.errors.length > 0 && (
            <div className="text-xs opacity-90">{confirmed.batch.errors.length} row(s) were skipped — see Import History for details.</div>
          )}
        </div>
      )}
    </div>
  );
}
