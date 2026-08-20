/**
 * Deterministic extraction status for a single field. This is NOT a
 * confidence score — the engine is rule-based, not a model, so it never
 * reports a probability. It reports one of exactly these four states.
 */
export type FieldStatus = "Detected" | "Not Detected" | "Needs Review" | "User Confirmed";

export interface DestinationBreakdownEntry {
  name: string;
  nights?: number;
}

/** Everything the rule-based engine can populate from a piece of input text. All fields optional/undefined until (and unless) detected. */
export interface ExtractedQueryFields {
  destination?: string;
  destinationBreakdown?: DestinationBreakdownEntry[];
  travelDate?: string; // ISO date, arrival
  departureDate?: string; // ISO date
  durationDays?: number;
  numberOfNights?: number;
  adults?: number;
  children?: number;
  infants?: number;
  rooms?: number;
  hotelCategory?: string;
  mealPlan?: string;
  transportPreference?: string;
  airportTransfer?: boolean;
  activitiesList?: string[];
  budgetAmount?: number;
  budgetCurrency?: string;
  specialNotes?: string;
  guestName?: string;
  phoneNumber?: string;
  guestEmail?: string;
}

export type ExtractionStatusMap = Partial<Record<keyof ExtractedQueryFields, FieldStatus>>;

export interface ExtractionResult {
  fields: ExtractedQueryFields;
  status: ExtractionStatusMap;
  sourceLanguage: "English" | "Vietnamese" | "Unknown";
  /** True when any field could not be confidently parsed and needs human attention before approval — mirrors "Some information could not be automatically interpreted." */
  needsReview: boolean;
}
