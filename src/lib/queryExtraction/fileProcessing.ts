const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB, matches the existing rate-sheet CSV import limit

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const ALLOWED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const ALLOWED_PDF_TYPE = "application/pdf";
const ALLOWED_PDF_EXTENSION = /\.pdf$/i;

export interface FileValidationResult {
  ok: boolean;
  error?: string;
}

/** Validates extension, MIME type, and size before any processing happens. Never executes the uploaded file — it's only ever read as bytes/text. */
export function validateUploadedFile(file: File, kind: "image" | "pdf"): FileValidationResult {
  if (file.size === 0) return { ok: false, error: "The uploaded file is empty." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "File is too large (max 10MB)." };

  if (kind === "image") {
    if (!ALLOWED_IMAGE_EXTENSIONS.test(file.name)) return { ok: false, error: "Only JPG, PNG, or WEBP images are supported." };
    if (file.type && !ALLOWED_IMAGE_TYPES.has(file.type)) return { ok: false, error: "That file doesn't look like a JPG, PNG, or WEBP image." };
  } else {
    if (!ALLOWED_PDF_EXTENSION.test(file.name)) return { ok: false, error: "Only PDF files are supported here." };
    if (file.type && file.type !== ALLOWED_PDF_TYPE) return { ok: false, error: "That file doesn't look like a PDF." };
  }
  return { ok: true };
}

export interface TextExtractionResult {
  ok: boolean;
  text?: string;
  /** True when the PDF/image needed OCR (no selectable text) rather than direct text extraction. */
  usedOcr?: boolean;
  error?: string;
}

/**
 * Extracts text from a PDF. Tries direct text extraction first (pdf-parse,
 * pure JS — no OCR needed for text-based PDFs); if the PDF has no
 * extractable text (a scanned/image-only PDF), the caller should fall back
 * to rendering pages to images and running extractTextFromImage on those —
 * see the setup notes in this module's accompanying documentation for why
 * that fallback isn't wired in automatically (it needs a PDF-to-image
 * renderer, which is a heavier dependency this change intentionally
 * doesn't add without your sign-off).
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<TextExtractionResult> {
  try {
    // Lazy import so environments that never touch PDF upload don't pay the
    // parse cost / need the dependency resolved at build time for other pages.
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    const text = (result.text || "").trim();

    if (!text) {
      return {
        ok: false,
        error:
          "This PDF has no selectable text (it looks like a scanned document). Scanned-PDF OCR isn't wired up in this environment yet — try exporting the page as an image and using \"Upload Image\" instead, or paste the text manually.",
      };
    }
    return { ok: true, text, usedOcr: false };
  } catch (err) {
    return {
      ok: false,
      error: `Could not read that PDF (${err instanceof Error ? err.message : "unknown error"}). Please check it's a valid, non-corrupted PDF.`,
    };
  }
}

/**
 * Runs local OCR (tesseract.js — WASM, no native binary, no external API)
 * on an uploaded image and returns the recognized text. If the OCR engine
 * can't initialize in this environment (missing worker assets, no network
 * for tesseract.js's one-time trained-data download, etc.), this returns a
 * clear configuration message instead of silently failing or falling back
 * to any cloud service.
 */
export async function extractTextFromImage(buffer: Buffer): Promise<TextExtractionResult> {
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng+vie");
    try {
      const { data } = await worker.recognize(buffer);
      const text = (data.text || "").trim();
      if (!text) {
        return { ok: false, error: "No readable text was found in that image. Try a clearer screenshot, or use \"WhatsApp / Text\" to paste the message instead." };
      }
      return { ok: true, text, usedOcr: true };
    } finally {
      await worker.terminate();
    }
  } catch (err) {
    console.error("[queryExtraction] OCR unavailable:", err);
    return {
      ok: false,
      error:
        "Local OCR isn't available in this environment right now. This usually means the OCR engine's assets haven't been set up yet — see the OCR setup notes. In the meantime, try \"WhatsApp / Text\" and paste the message content instead.",
    };
  }
}
