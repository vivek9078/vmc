import { normalizeForMatch } from "./normalize";
import { ACTIVITY_KEYWORDS } from "./dictionaries";
import type { ExtractedQueryFields, ExtractionStatusMap } from "./types";

const TRANSPORT_KEYWORDS = [
  "private transfer", "private car", "shared transfer", "domestic flight",
  "bus", "van", "coach", "train",
];

/** Airport pickup/drop/transfer language, and general transport preference (private car, shared transfer, bus, etc). */
export function extractTransport(rawText: string, fields: ExtractedQueryFields, status: ExtractionStatusMap): void {
  const text = normalizeForMatch(rawText);

  const pickup = /airport\s*(pickup|pick-up|pick up)/.test(text);
  const drop = /airport\s*(drop|drop-off|drop off)/.test(text);
  const transfer = /airport\s*transfer/.test(text);

  if (pickup || drop || transfer) {
    fields.airportTransfer = true;
    status.airportTransfer = "Detected";
  } else {
    status.airportTransfer = "Not Detected";
  }

  const hit = TRANSPORT_KEYWORDS.find((k) => text.includes(k));
  if (hit) {
    fields.transportPreference = hit.replace(/\b\w/g, (c) => c.toUpperCase());
    status.transportPreference = "Detected";
  } else {
    status.transportPreference = "Not Detected";
  }
}

/** Matches known bookable activities mentioned in the text. Pass a `catalog` (e.g. names pulled from the live Activities inventory) to extend recognition beyond the built-in ACTIVITY_KEYWORDS list. */
export function extractActivities(rawText: string, fields: ExtractedQueryFields, status: ExtractionStatusMap, catalog: string[] = []): void {
  const text = normalizeForMatch(rawText);
  const pool = [...new Set([...ACTIVITY_KEYWORDS, ...catalog.map((c) => c.toLowerCase())])];
  const hits = pool.filter((a) => text.includes(normalizeForMatch(a)));

  if (hits.length > 0) {
    fields.activitiesList = hits.map((h) => h.replace(/\b\w/g, (c) => c.toUpperCase()));
    status.activitiesList = "Detected";
  } else {
    status.activitiesList = "Not Detected";
  }
}

/** Meal plan language: breakfast/half board/full board and common abbreviations (B&B, HB, FB). */
export function extractMealPlan(rawText: string, fields: ExtractedQueryFields, status: ExtractionStatusMap): void {
  const text = normalizeForMatch(rawText);

  if (/\ball\s*meals?\b|\bfull\s*board\b|\bfb\b/.test(text)) {
    fields.mealPlan = "Full Board";
  } else if (/\bhalf\s*board\b|\bhb\b/.test(text)) {
    fields.mealPlan = "Half Board";
  } else if (/breakfast\s*included|\bb\s*&\s*b\b|\bbreakfast\b/.test(text)) {
    fields.mealPlan = "Breakfast Included";
  }

  status.mealPlan = fields.mealPlan ? "Detected" : "Not Detected";
}
