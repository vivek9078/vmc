import { VIETNAMESE_MARKER_WORDS } from "./dictionaries";

/**
 * Strips diacritics and lowercases, for matching only. The caller must keep
 * the original text separately — this function's output is never shown to
 * a user or stored as the "original input".
 */
export function normalizeForMatch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // combining diacritical marks
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type DetectedLanguage = "English" | "Vietnamese" | "Unknown";

/**
 * Lightweight local heuristic — NOT a general-purpose language detector.
 * Flags Vietnamese when the raw text contains Vietnamese-specific diacritic
 * characters (đ, ơ, ư, or any combining tone mark) or when enough known
 * Vietnamese travel-vocabulary words are present. Otherwise assumes English
 * if enough Latin alphabetic content exists, else Unknown. Confidence is
 * intentionally coarse — ambiguous cases are Unknown, never guessed.
 */
export function detectLanguage(rawText: string): DetectedLanguage {
  const text = rawText.trim();
  if (text.length < 3) return "Unknown";

  const hasVietnameseDiacritics = /[đơưĐƠƯ]|[\u0300-\u036f]/.test(text.normalize("NFD"));
  if (hasVietnameseDiacritics) return "Vietnamese";

  const normalized = normalizeForMatch(text);
  const markerHits = VIETNAMESE_MARKER_WORDS.filter((w) => normalized.includes(w)).length;
  if (markerHits >= 2) return "Vietnamese";

  const alphaChars = (text.match(/[a-zA-Z]/g) ?? []).length;
  if (alphaChars >= Math.min(10, text.length * 0.3)) return "English";

  return "Unknown";
}

/** Parses a number out of a string like "6", "6.0", "06" — returns null (not 0) when nothing parseable is present, so callers can distinguish "found zero" from "found nothing". */
export function parseIntSafe(value: string | undefined | null): number | null {
  if (!value) return null;
  const n = parseInt(value.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}
