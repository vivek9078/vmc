/**
 * Dynamic CSV column mapping for CSV Sync.
 *
 * The uploaded master CSVs are not all shaped the same way — one file might
 * be "Duty Code, A, B, Service, ..., 4 SEATER, 7 SEATER" (transport), another
 * "Hotel Name, Hotel Category, City, Room Type, ...", another a flat list of
 * add-on services. Rather than hard-coding a fixed column list, every header
 * is classified into one of three buckets:
 *
 *   1. A known "base field" alias (see BASE_FIELD_ALIASES) — from/to, service,
 *      distance, hotel name, room type, etc.
 *   2. A vehicle-capacity price column ("4 SEATER", "16 Seater", "Coach",
 *      "Minibus", ...) — detected dynamically, not from a fixed list, so a
 *      future "35 SEATER" or "Sedan" column is recognized without a code
 *      change (spec section 7 & 23).
 *   3. Unrecognized — preserved verbatim in `customFields` (spec section 3),
 *      never silently discarded.
 */

export type BaseField =
  | "dutyCode" | "from" | "to" | "service" | "distance" | "startTime" | "duration" | "daySchedule" | "season"
  | "supplier" | "category" | "subcategory" | "serviceType" | "tourType" | "description"
  | "hotelName" | "hotelCategory" | "location" | "city" | "area" | "roomType" | "mealPlan"
  | "activityName" | "tourName" | "guide" | "transferType" | "operatingDays" | "schedule"
  | "addonName" | "currency" | "price" | "rate" | "genericName";

const BASE_FIELD_ALIASES: Record<string, BaseField> = {
  "duty code": "dutyCode", "dutycode": "dutyCode", "code": "dutyCode",
  a: "from", from: "from", pickup: "from", "pick up": "from", origin: "from",
  b: "to", to: "to", drop: "to", "drop off": "to", "drop-off": "to", destination: "to",
  service: "service", "service type": "serviceType", "transfer type": "transferType",
  distance: "distance", "start time": "startTime", "starttime": "startTime",
  "duration(mins)": "duration", "duration (mins)": "duration", "duration(min)": "duration", "duration (min)": "duration",
  duration: "duration", "day schedule": "daySchedule", schedule: "schedule", "operating days": "operatingDays", days: "operatingDays",
  "general season": "season", season: "season", "date range": "season",
  supplier: "supplier", vendor: "supplier",
  category: "category", subcategory: "subcategory", "sub category": "subcategory", "sub-category": "subcategory",
  "tour type": "tourType", description: "description", notes: "description", remarks: "description",
  "hotel name": "hotelName", hotel: "hotelName", property: "hotelName",
  "hotel category": "hotelCategory", "star rating": "hotelCategory",
  location: "location", city: "city", area: "area", region: "area", zone: "area",
  "room type": "roomType", "meal plan": "mealPlan", board: "mealPlan",
  "activity name": "activityName", activity: "activityName", "tour name": "tourName", tour: "tourName",
  guide: "guide",
  "add-on": "addonName", addon: "addonName", "add on": "addonName", "addon name": "addonName", "service/add-on": "addonName",
  currency: "currency",
  price: "price", rate: "rate", cost: "price", amount: "price", "unit price": "price",
  name: "genericName", "item name": "genericName", title: "genericName", item: "genericName",
};

/** Words that identify a "vehicle" column even without a leading number, e.g. "Coach", "Minibus". Checked only when the numeric-seater pattern doesn't match. */
const VEHICLE_WORD_PATTERN = /\b(coach|minibus|mini\s*bus|van|suv|sedan|limousine|bus|car|seater)\b/i;
/** "4 SEATER", "16-Seater", "7 Seat", "45Pax", "29 pax" → capacity 4/16/7/45/29. */
const SEATER_PATTERN = /(\d+)\s*[- ]?\s*(seater|seat|pax|passenger)/i;

export interface VehicleColumnMatch {
  header: string;
  capacity: number; // 0 when the column names a vehicle class without a numeric capacity (e.g. "Coach")
  vehicleLabel: string; // display label, e.g. "4 Seater" or "Coach"
}

/** Returns a vehicle-column match if `header` looks like a per-vehicle price column, else null. Deliberately pattern-based (not a fixed list) so new capacities/vehicle names in future CSVs are picked up automatically. */
export function matchVehicleColumn(header: string): VehicleColumnMatch | null {
  const h = header.trim();
  if (!h) return null;
  const seaterMatch = h.match(SEATER_PATTERN);
  if (seaterMatch) {
    const capacity = Number(seaterMatch[1]) || 0;
    return { header: h, capacity, vehicleLabel: capacity > 0 ? `${capacity} Seater` : h };
  }
  if (VEHICLE_WORD_PATTERN.test(h) && !BASE_FIELD_ALIASES[h.toLowerCase()]) {
    return { header: h, capacity: 0, vehicleLabel: h.replace(/\s+/g, " ").trim() };
  }
  return null;
}

export function matchBaseField(header: string): BaseField | null {
  return BASE_FIELD_ALIASES[header.trim().toLowerCase()] ?? null;
}

export interface HeaderClassification {
  header: string;
  baseField: BaseField | null;
  vehicle: VehicleColumnMatch | null;
}

/** Classifies every header in one pass — used to build the per-row normalizer below. */
export function classifyHeaders(headers: string[]): HeaderClassification[] {
  return headers.map((header) => {
    const baseField = matchBaseField(header);
    const vehicle = baseField ? null : matchVehicleColumn(header);
    return { header, baseField, vehicle };
  });
}
