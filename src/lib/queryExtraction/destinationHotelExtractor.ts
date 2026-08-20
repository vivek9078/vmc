import { normalizeForMatch } from "./normalize";
import { DESTINATION_ALIASES } from "./dictionaries";
import type { DestinationBreakdownEntry, ExtractedQueryFields, ExtractionStatusMap } from "./types";

const DESTINATION_KEYS = Object.keys(DESTINATION_ALIASES).sort((a, b) => b.length - a.length); // longest-first so "ho chi minh city" wins over "ho chi minh"

/**
 * Finds every known destination mentioned, with an optional per-destination
 * night count. Supports:
 *   "3 nights Hanoi, 2 nights Halong Bay"
 *   "Hanoi 3N + Halong 2N + Da Nang 2N"
 *   a single destination with no per-leg breakdown.
 * Only known aliases from DESTINATION_ALIASES are recognized — arbitrary
 * place names are never invented or translated.
 */
export function extractDestinations(rawText: string, fields: ExtractedQueryFields, status: ExtractionStatusMap): void {
  const normalized = normalizeForMatch(rawText);
  const found: DestinationBreakdownEntry[] = [];
  const seen = new Set<string>();

  for (const key of DESTINATION_KEYS) {
    const idx = normalized.indexOf(key);
    if (idx === -1) continue;
    const canonical = DESTINATION_ALIASES[key];
    if (seen.has(canonical)) continue;
    seen.add(canonical);

    // Look for a night count within ~15 chars on either side of the match,
    // e.g. "3 nights Hanoi" (before) or "Hanoi 3N" / "Hanoi 3 nights" (after).
    const windowStart = Math.max(0, idx - 15);
    const windowEnd = Math.min(normalized.length, idx + key.length + 15);
    const before = normalized.slice(windowStart, idx);
    const after = normalized.slice(idx + key.length, windowEnd);

    const beforeNights = before.match(/(\d+)\s*n(?:ights?)?\s*$/);
    const afterNights = after.match(/^\s*[,\-–]?\s*(\d+)\s*n(?:ights?)?\b/);
    const nightsStr = beforeNights?.[1] ?? afterNights?.[1];

    found.push({ name: canonical, nights: nightsStr ? Number(nightsStr) : undefined });
  }

  if (found.length === 0) {
    status.destination = "Not Detected";
    return;
  }

  fields.destinationBreakdown = found;
  fields.destination = found.length === 1 ? found[0].name : found.map((f) => f.name).join(" + ");
  status.destination = "Detected";
}

/**
 * Recognizes hotel category/tier language: star ratings ("3 star",
 * "4-star", "5star") and qualitative tiers (luxury, budget, boutique,
 * resort, beachfront, central location).
 */
export function extractHotelCategory(rawText: string, fields: ExtractedQueryFields, status: ExtractionStatusMap): void {
  const text = normalizeForMatch(rawText);

  const starMatch = text.match(/(\d)\s*-?\s*star\b/);
  if (starMatch) {
    fields.hotelCategory = starMatch[1];
    status.hotelCategory = "Detected";
    return;
  }

  const tiers = ["luxury", "budget", "boutique", "resort", "beachfront", "central location"];
  const tierHit = tiers.find((t) => text.includes(t));
  if (tierHit) {
    fields.hotelCategory = tierHit.replace(/\b\w/g, (c) => c.toUpperCase());
    status.hotelCategory = "Detected";
    return;
  }

  status.hotelCategory = "Not Detected";
}
