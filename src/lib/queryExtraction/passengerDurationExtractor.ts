import { normalizeForMatch, parseIntSafe } from "./normalize";
import type { ExtractedQueryFields, ExtractionStatusMap } from "./types";

/**
 * Extracts adults/children/infants/rooms from free text. Supports:
 *   "6 adults", "4 adult", "4 pax", "4 PAX", "4 people", "4 persons",
 *   "2 adults + 2 children", "2 adults and 2 kids", "family of 5",
 *   Vietnamese: "người lớn", "trẻ em", "em bé", "khách", "người".
 * "family of N" sets adults=N but flags Needs Review since composition
 * (how many are actually children) can't be determined from that phrase
 * alone — the engine never guesses a split.
 */
export function extractPassengers(rawText: string, fields: ExtractedQueryFields, status: ExtractionStatusMap): void {
  const text = normalizeForMatch(rawText);

  // Specific compounds first so the generic single-word Vietnamese patterns
  // ("khách", "người") don't double-match part of "người lớn".
  const adultsMatch =
    text.match(/(\d+)\s*(?:adults?|pax|people|persons?|guests?)\b/) ||
    text.match(/(\d+)\s*nguoi\s*lon\b/) || // "người lớn" after diacritic-stripping
    text.match(/(\d+)\s*khach\b/) ||
    (!/nguoi\s*lon/.test(text) ? text.match(/(\d+)\s*nguoi\b/) : null);

  const childrenMatch =
    text.match(/(\d+)\s*(?:children|child|kids?)\b/) ||
    text.match(/(\d+)\s*tre\s*em\b/);

  const infantsMatch =
    text.match(/(\d+)\s*(?:infants?)\b/) ||
    text.match(/(\d+)\s*em\s*be\b/);

  const familyMatch = text.match(/family\s+of\s+(\d+)/);

  if (adultsMatch) {
    fields.adults = parseIntSafe(adultsMatch[1]) ?? undefined;
    status.adults = "Detected";
  }
  if (childrenMatch) {
    fields.children = parseIntSafe(childrenMatch[1]) ?? undefined;
    status.children = "Detected";
  }
  if (infantsMatch) {
    fields.infants = parseIntSafe(infantsMatch[1]) ?? undefined;
    status.infants = "Detected";
  }

  if (!adultsMatch && familyMatch) {
    fields.adults = parseIntSafe(familyMatch[1]) ?? undefined;
    status.adults = "Needs Review"; // total pax known, adult/child split is not
  }

  const roomsMatch = text.match(/(\d+)\s*(?:rooms?|phong)\b/);
  if (roomsMatch) {
    fields.rooms = parseIntSafe(roomsMatch[1]) ?? undefined;
    status.rooms = "Detected";
  }

  if (!fields.adults) status.adults = status.adults ?? "Not Detected";
  if (!fields.children) status.children = status.children ?? "Not Detected";
  if (!fields.infants) status.infants = status.infants ?? "Not Detected";
  if (!fields.rooms) status.rooms = status.rooms ?? "Not Detected";
}

/**
 * Extracts trip duration. Supports:
 *   "7 days", "6 nights", "7 days 6 nights", "7D6N", "7D/6N", "7D 6N",
 *   "one week", "1 week".
 * Never derives days from nights (or vice versa) by the days=nights+1
 * convention — that's a guess the spec explicitly forbids, so an
 * unstated half of the pair is left "Not Detected" for the reviewer.
 * "(one|1) week" sets nights=7 but flags Needs Review since the
 * days/nights split for a week isn't stated explicitly.
 */
export function extractDuration(rawText: string, fields: ExtractedQueryFields, status: ExtractionStatusMap): void {
  const text = normalizeForMatch(rawText);

  const dnShorthand = text.match(/(\d+)\s*d\s*\/?\s*(\d+)\s*n\b/);
  const daysNights = text.match(/(\d+)\s*days?\s*[,/]?\s*(\d+)\s*nights?/);

  if (daysNights) {
    fields.durationDays = parseIntSafe(daysNights[1]) ?? undefined;
    fields.numberOfNights = parseIntSafe(daysNights[2]) ?? undefined;
    status.durationDays = "Detected";
    status.numberOfNights = "Detected";
    return;
  }
  if (dnShorthand) {
    fields.durationDays = parseIntSafe(dnShorthand[1]) ?? undefined;
    fields.numberOfNights = parseIntSafe(dnShorthand[2]) ?? undefined;
    status.durationDays = "Detected";
    status.numberOfNights = "Detected";
    return;
  }

  const weekMatch = text.match(/\b(?:one|1)\s*week\b/);
  if (weekMatch) {
    fields.numberOfNights = 7;
    status.numberOfNights = "Needs Review"; // exact days/nights split not stated
    status.durationDays = "Not Detected";
    return;
  }

  const nightsOnly = text.match(/(\d+)\s*nights?\b/) || text.match(/(\d+)\s*dem\b/);
  const daysOnly = text.match(/(\d+)\s*days?\b/) || text.match(/(\d+)\s*ngay\b/);

  if (nightsOnly) {
    fields.numberOfNights = parseIntSafe(nightsOnly[1]) ?? undefined;
    status.numberOfNights = "Detected";
  } else {
    status.numberOfNights = status.numberOfNights ?? "Not Detected";
  }
  if (daysOnly) {
    fields.durationDays = parseIntSafe(daysOnly[1]) ?? undefined;
    status.durationDays = "Detected";
  } else {
    status.durationDays = status.durationDays ?? "Not Detected";
  }
}
