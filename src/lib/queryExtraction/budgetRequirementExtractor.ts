import { SPECIAL_REQUIREMENT_KEYWORDS } from "./dictionaries";
import { normalizeForMatch } from "./normalize";
import type { ExtractedQueryFields, ExtractionStatusMap } from "./types";

const CURRENCY_SYMBOLS: Record<string, string> = { "₹": "INR", "$": "USD", "€": "EUR", "£": "GBP", "₫": "VND" };
const CURRENCY_CODES = ["INR", "USD", "EUR", "GBP", "VND", "AUD", "CAD", "SGD"];

/**
 * Recognizes "₹50,000", "INR 50000", "$1000", "USD 1000", "50000 INR".
 * Currency is preserved exactly as stated — no conversion is ever
 * performed, per the "do not perform uncertain currency conversion" rule.
 */
export function extractBudget(rawText: string, fields: ExtractedQueryFields, status: ExtractionStatusMap): void {
  // Symbol prefix: ₹50,000 / $1000
  let m = rawText.match(/([₹$€£₫])\s*([\d,]+)/);
  if (m) {
    fields.budgetAmount = Number(m[2].replace(/,/g, ""));
    fields.budgetCurrency = CURRENCY_SYMBOLS[m[1]];
    status.budgetAmount = "Detected";
    return;
  }

  // Code prefix: INR 50000 / USD 1000
  const codePattern = new RegExp(`\\b(${CURRENCY_CODES.join("|")})\\s*([\\d,]+)\\b`, "i");
  m = rawText.match(codePattern);
  if (m) {
    fields.budgetAmount = Number(m[2].replace(/,/g, ""));
    fields.budgetCurrency = m[1].toUpperCase();
    status.budgetAmount = "Detected";
    return;
  }

  // Code suffix: 50000 INR
  const suffixPattern = new RegExp(`\\b([\\d,]+)\\s*(${CURRENCY_CODES.join("|")})\\b`, "i");
  m = rawText.match(suffixPattern);
  if (m) {
    fields.budgetAmount = Number(m[1].replace(/,/g, ""));
    fields.budgetCurrency = m[2].toUpperCase();
    status.budgetAmount = "Detected";
    return;
  }

  status.budgetAmount = "Not Detected";
}

/** Matches known special-requirement keywords and appends a human-readable summary to specialNotes (existing free-text field — no new schema needed here). */
export function extractSpecialRequirements(rawText: string, fields: ExtractedQueryFields, status: ExtractionStatusMap): void {
  const text = normalizeForMatch(rawText);
  const hits = Object.entries(SPECIAL_REQUIREMENT_KEYWORDS)
    .filter(([kw]) => text.includes(kw))
    .map(([, label]) => label);
  const unique = [...new Set(hits)];

  if (unique.length > 0) {
    fields.specialNotes = unique.join(", ");
    status.specialNotes = "Detected";
  } else {
    status.specialNotes = "Not Detected";
  }
}

/** Email and phone are extracted with high confidence via well-established patterns. Guest name is only extracted when explicitly labeled ("Name: ...", "Client: ...") — never guessed from surrounding prose, since a wrong guess here is worse than leaving it blank for the reviewer. */
export function extractContactInfo(rawText: string, fields: ExtractedQueryFields, status: ExtractionStatusMap): void {
  const emailMatch = rawText.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  if (emailMatch) {
    fields.guestEmail = emailMatch[0];
    status.guestEmail = "Detected";
  } else {
    status.guestEmail = "Not Detected";
  }

  const phoneMatch = rawText.match(/(\+?\d[\d\s\-()]{7,16}\d)/);
  if (phoneMatch) {
    fields.phoneNumber = phoneMatch[0].trim();
    status.phoneNumber = "Detected";
  } else {
    status.phoneNumber = "Not Detected";
  }

  const nameMatch = rawText.match(/\b(?:name|client|guest|contact)\s*[:\-]\s*([A-Za-z][A-Za-z .'-]{1,60})/i);
  if (nameMatch) {
    fields.guestName = nameMatch[1].trim();
    status.guestName = "Detected";
  } else {
    status.guestName = "Not Detected";
  }
}
