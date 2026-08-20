"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { rollbackImportAction } from "./actions";
import type { ImportBatch } from "@/types/domain";

function totalOf(counts: ImportBatch["created"]): number {
  return counts.hotel + counts.transport + counts.activity + counts.addon;
}

export function ImportHistoryTable({ batches, canManage }: { batches: ImportBatch[]; canManage: boolean }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  async function handleRollback(batchId: string) {
    setRollingBack(batchId);
    setConfirmingId(null);
    const result = await rollbackImportAction(batchId);
    setRollingBack(null);
    setMessage({
      id: batchId,
      ok: result.ok,
      text: result.ok ? `Rolled back — ${result.deactivated} record(s) deactivated, ${result.restored} restored.` : result.error ?? "Rollback failed.",
    });
    if (result.ok) router.refresh();
  }

  if (batches.length === 0) {
    return (
      <div className="card-surface p-6 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
        No imports yet. Upload a CSV above to get started.
      </div>
    );
  }

  return (
    <div className="card-surface overflow-x-auto">
      <table className="w-full text-sm">
        <thead style={{ background: "var(--color-surface)" }}>
          <tr>
            <th className="text-left px-4 py-2.5 text-xs font-medium">File</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium">Uploaded</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium">Rows</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium">Created</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium">Updated</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium">Errors</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium">Status</th>
            {canManage && <th className="text-right px-4 py-2.5 text-xs font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => {
            const isExpanded = expanded === b.id;
            return (
              <Fragment key={b.id}>
                <tr className="border-t" style={{ borderColor: "var(--color-border)" }}>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : b.id)}
                      className="flex items-center gap-1 font-medium text-left"
                    >
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      <span className="truncate max-w-[220px]">{b.fileName}</span>
                    </button>
                  </td>
                  <td className="px-4 py-2.5" style={{ color: "var(--color-text-secondary)" }}>
                    {new Date(b.uploadedAt).toLocaleString()}
                    <div className="text-xs">{b.uploadedByEmail}</div>
                  </td>
                  <td className="px-4 py-2.5">{b.totalRows}</td>
                  <td className="px-4 py-2.5" style={{ color: "var(--color-emerald-700)" }}>{totalOf(b.created)}</td>
                  <td className="px-4 py-2.5">{totalOf(b.updated)}</td>
                  <td className="px-4 py-2.5">{b.errors.length > 0 ? <span style={{ color: "#b91c1c" }}>{b.errors.length}</span> : "—"}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                      style={
                        b.status === "Completed"
                          ? { background: "var(--color-emerald-100)", color: "var(--color-emerald-700)" }
                          : { background: "#f3f4f6", color: "#6b7280" }
                      }
                    >
                      {b.status === "Completed" ? "COMPLETED" : "ROLLED BACK"}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-2.5 text-right">
                      {b.status === "Completed" && (
                        confirmingId === b.id ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Undo this import?</span>
                            <button
                              onClick={() => handleRollback(b.id)}
                              disabled={rollingBack === b.id}
                              className="text-xs font-medium px-2 py-1 rounded-lg text-white"
                              style={{ background: "#b91c1c" }}
                            >
                              {rollingBack === b.id ? <Loader2 size={12} className="animate-spin" /> : "Yes, roll back"}
                            </button>
                            <button onClick={() => setConfirmingId(null)} className="text-xs px-2 py-1" style={{ color: "var(--color-text-secondary)" }}>
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmingId(b.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                            style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
                          >
                            <RotateCcw size={12} /> Rollback
                          </button>
                        )
                      )}
                    </td>
                  )}
                </tr>
                {isExpanded && (
                  <tr className="border-t" style={{ borderColor: "var(--color-border)" }}>
                    <td colSpan={canManage ? 8 : 7} className="px-4 py-3" style={{ background: "var(--color-surface)" }}>
                      <div className="text-xs space-y-2">
                        <div>
                          Hotels: +{b.created.hotel}/{b.updated.hotel} · Transport: +{b.created.transport}/{b.updated.transport} ·
                          {" "}Activities: +{b.created.activity}/{b.updated.activity} · Add-ons: +{b.created.addon}/{b.updated.addon}
                          {" "}(created/updated)
                        </div>
                        {b.errors.length > 0 && (
                          <div>
                            <div className="font-medium mb-1">Rows needing review:</div>
                            <ul className="list-disc pl-4 space-y-0.5" style={{ color: "var(--color-text-secondary)" }}>
                              {b.errors.slice(0, 20).map((e, i) => (
                                <li key={i}>Row {e.rowNumber}: {e.message}</li>
                              ))}
                              {b.errors.length > 20 && <li>+{b.errors.length - 20} more…</li>}
                            </ul>
                          </div>
                        )}
                        {b.status === "RolledBack" && b.rolledBackAt && (
                          <div style={{ color: "var(--color-text-secondary)" }}>Rolled back {new Date(b.rolledBackAt).toLocaleString()}</div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                {message?.id === b.id && (
                  <tr>
                    <td colSpan={canManage ? 8 : 7} className="px-4 py-2 text-xs">
                      <span
                        className="inline-flex items-center gap-1.5"
                        style={{ color: message.ok ? "var(--color-emerald-700)" : "#b91c1c" }}
                      >
                        {message.ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {message.text}
                      </span>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
