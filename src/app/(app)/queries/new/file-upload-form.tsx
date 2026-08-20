"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileText, Image as ImageIcon, X } from "lucide-react";
import { extractQueryFromFileAction } from "./intake-actions";
import { DraftReview } from "./draft-review";
import type { ExtractionResult } from "@/lib/queryExtraction";
import type { QuerySourceType } from "@/types/domain";

const ACCEPT: Record<"image" | "pdf", string> = {
  image: "image/jpeg,image/jpg,image/png,image/webp",
  pdf: "application/pdf",
};

export function FileUploadForm({ kind, onBack }: { kind: "image" | "pdf"; onBack: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ result: ExtractionResult; originalInputText: string; sourceType: QuerySourceType; uploadedFileName?: string } | null>(null);

  function pickFile(f: File | undefined | null) {
    if (!f) return;
    setError(null);
    setFile(f);
  }

  async function handleExtract() {
    if (!file) return;
    setSubmitting(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("kind", kind);
    const res = await extractQueryFromFileAction(formData);
    setSubmitting(false);
    if (!res.ok || !res.result) {
      setError(res.error ?? "Could not process that file.");
      return;
    }
    setDraft({
      result: res.result,
      originalInputText: res.originalInputText ?? "",
      sourceType: res.sourceType ?? (kind === "pdf" ? "PDF" : "Image"),
      uploadedFileName: res.uploadedFileName,
    });
  }

  if (draft) {
    return <DraftReview result={draft.result} originalInputText={draft.originalInputText} sourceType={draft.sourceType} uploadedFileName={draft.uploadedFileName} />;
  }

  const Icon = kind === "pdf" ? FileText : ImageIcon;

  return (
    <div className="card-surface p-6 max-w-2xl">
      <h2 className="text-sm font-semibold mb-1">{kind === "pdf" ? "Upload PDF" : "Upload Image / Screenshot"}</h2>
      <p className="text-xs mb-4" style={{ color: "var(--color-text-secondary)" }}>
        {kind === "pdf"
          ? "Text-based PDFs are read directly. Scanned PDFs need local OCR — see the setup notes if this fails."
          : "JPG, PNG, or WEBP. Processed locally with on-device OCR — nothing is sent to an external service."}
      </p>

      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-12 cursor-pointer transition-colors"
          style={{ borderColor: dragOver ? "var(--color-teal-500)" : "var(--color-border)", background: dragOver ? "var(--color-teal-100)" : "var(--color-bg)" }}
        >
          <UploadCloud size={28} style={{ color: "var(--color-text-muted)" }} />
          <p className="text-sm font-medium">Drag and drop, or click to browse</p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Max 10MB</p>
          <input ref={inputRef} type="file" accept={ACCEPT[kind]} className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: "var(--color-border)" }}>
          <Icon size={18} style={{ color: "var(--color-teal-600)" }} />
          <span className="text-sm flex-1 truncate">{file.name}</span>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{(file.size / 1024).toFixed(0)} KB</span>
          <button type="button" onClick={() => setFile(null)} aria-label="Remove file"><X size={16} style={{ color: "var(--color-text-muted)" }} /></button>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mt-3">{error}</p>}

      <div className="flex justify-between items-center mt-4">
        <button type="button" onClick={onBack} className="text-sm font-medium px-4 py-2.5 rounded-xl" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
          Back
        </button>
        <button
          type="button"
          disabled={submitting || !file}
          onClick={handleExtract}
          className="text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-transform hover:scale-[1.02] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
        >
          {submitting ? "Processing…" : "Extract Query"}
        </button>
      </div>
    </div>
  );
}
