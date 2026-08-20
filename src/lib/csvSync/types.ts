import type { SyncEntityType } from "@/types/domain";

export interface VehiclePrice {
  header: string; // original column header, e.g. "16 SEATER"
  vehicleLabel: string; // "16 Seater"
  capacity: number; // 0 if not numeric (e.g. "Coach")
  price: number;
}

/**
 * One CSV row, normalized into known fields (whatever the source file
 * actually provided — most rows will only populate a handful of these) plus
 * whatever didn't map to a known field, preserved in `customFields` so
 * nothing is silently discarded (spec section 3).
 */
export interface NormalizedRow {
  rowNumber: number; // 1-based, matches the row the admin would see in the CSV
  sourceFile: string;
  type: SyncEntityType | "other";

  dutyCode?: string;
  from?: string;
  to?: string;
  service?: string;
  serviceType?: string;
  transferType?: string;
  distance?: string;
  startTime?: string;
  duration?: string;
  daySchedule?: string;
  schedule?: string;
  operatingDays?: string;
  season?: string;
  supplier?: string;
  category?: string;
  subcategory?: string;
  tourType?: string;
  description?: string;

  hotelName?: string;
  genericName?: string; // a plain "Name"/"Item"/"Title" column — used as a fallback identity when the category-specific name field (hotelName/activityName/addonName) isn't present, mainly for CSVs uploaded from a category-scoped page (see expectedType in sync.ts)
  hotelCategory?: string;
  location?: string;
  city?: string;
  area?: string;
  roomType?: string;
  mealPlan?: string;

  activityName?: string;
  tourName?: string;
  guide?: string;

  addonName?: string;
  currency?: string;

  /** Single flat price (Rate/Price/Cost column) — used for hotel/activity/add-on rows that don't have per-vehicle columns. */
  flatPrice?: number;

  /** One entry per vehicle-capacity column that had a numeric value on this row (transport rows typically have several). */
  vehiclePrices: VehiclePrice[];

  /** Columns that didn't map to any known field — preserved verbatim (spec section 3). */
  customFields: Record<string, string>;
  /** The full original row, header → raw cell text, for audit/debugging (spec section 24). */
  originalData: Record<string, string>;
}

export interface RowIssue {
  rowNumber: number;
  message: string;
}

export interface ParsedCsvResult {
  fileName: string;
  rows: NormalizedRow[];
  issues: RowIssue[];
}
