import type { ExtractedQueryFields, ExtractionStatusMap } from "./types";

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};

function toIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/**
 * Parses one date phrase like "10 October 2026", "10 Oct 2026",
 * "October 10, 2026", "10/10/2026", or "10-10-2026". Numeric DD/MM/YYYY is
 * assumed (not MM/DD) — matches the international convention this DMC's
 * clients use, and is documented here rather than silently guessed per
 * request. Returns null if a year isn't present in the phrase — a missing
 * year is never inferred.
 */
function parseSingleDate(phrase: string): string | null {
  const p = phrase.trim();

  // "10 October 2026" / "10 Oct 2026"
  let m = p.match(/\b(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})\b/);
  if (m) {
    const month = MONTHS[m[2].toLowerCase()];
    if (month) return toIso(Number(m[3]), month, Number(m[1]));
  }

  // "October 10, 2026" / "Oct 10 2026"
  m = p.match(/\b([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (m) {
    const month = MONTHS[m[1].toLowerCase()];
    if (month) return toIso(Number(m[3]), month, Number(m[2]));
  }

  // "10/10/2026" or "10-10-2026" — DD/MM/YYYY
  m = p.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (m) return toIso(Number(m[3]), Number(m[2]), Number(m[1]));

  return null;
}

/**
 * Looks for an arrival/departure date pair ("10 Oct to 16 Oct", "10 Oct -
 * 16 Oct 2026") or a single date. When a range's second date omits the
 * year, it inherits the first date's year (same trip). When NO date in the
 * phrase carries a year at all, both fields are left undetected and
 * flagged Needs Review rather than assuming the current year.
 */
export function extractDates(rawText: string, fields: ExtractedQueryFields, status: ExtractionStatusMap): void {
  const rangeMatch = rawText.match(
    /\b(\d{1,2}\s+[A-Za-z]+\.?(?:\s+\d{4})?)\s*(?:to|-|–|until)\s*(\d{1,2}\s+[A-Za-z]+\.?(?:\s+\d{4})?)\b/
  );

  if (rangeMatch) {
    const yearMatch = rawText.match(/\b(20\d{2})\b/);
    let leftPhrase = rangeMatch[1];
    let rightPhrase = rangeMatch[2];
    if (!/\d{4}/.test(leftPhrase) && yearMatch) leftPhrase = `${leftPhrase} ${yearMatch[1]}`;
    if (!/\d{4}/.test(rightPhrase) && yearMatch) rightPhrase = `${rightPhrase} ${yearMatch[1]}`;

    const arrival = parseSingleDate(leftPhrase);
    const departure = parseSingleDate(rightPhrase);

    if (arrival) {
      fields.travelDate = arrival;
      status.travelDate = "Detected";
    } else {
      status.travelDate = "Needs Review"; // date phrase found, year missing/ambiguous
    }
    if (departure) {
      fields.departureDate = departure;
      status.departureDate = "Detected";
    } else {
      status.departureDate = "Needs Review";
    }
    return;
  }

  const single = parseSingleDate(rawText);
  if (single) {
    fields.travelDate = single;
    status.travelDate = "Detected";
  } else {
    // Only flag Needs Review if a date-shaped phrase exists without a year;
    // otherwise there's genuinely no date in the text at all.
    const dateShapeNoYear = /\b\d{1,2}\s+[A-Za-z]+\b(?!\s+\d{4})/.test(rawText) || /\b[A-Za-z]+\s+\d{1,2}\b(?!,?\s*\d{4})/.test(rawText);
    status.travelDate = dateShapeNoYear ? "Needs Review" : "Not Detected";
  }
  status.departureDate = status.departureDate ?? "Not Detected";
}
