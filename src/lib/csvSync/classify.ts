import type { SyncEntityType } from "@/types/domain";
import type { NormalizedRow } from "./types";
import { matchVehicleColumn } from "./columnMap";

/**
 * Reusable classification layer (kept separate from both the parser and the
 * UI per spec section 4) — decides what kind of inventory a normalized row
 * represents. Order matters: checked from most to least specific so a row
 * that happens to have both a hotel name and a price column (unlikely, but
 * CSVs are messy) still lands as a hotel rather than a generic add-on.
 */
export function classifyRow(row: NormalizedRow): SyncEntityType | "other" {
  if (row.hotelName) return "hotel";
  if (row.activityName || row.tourName) return "activity";
  if (row.addonName) return "addon";

  // Service-text hints that override the generic transport shape below —
  // a "Guide" or "Surcharge" line still has per-vehicle price columns (the
  // season-block master sheets price them per vehicle size too), but it
  // represents an ancillary service, not a route (spec section 9 examples).
  if (/\bguide\b/i.test(row.service ?? "")) return "addon";
  if (/surcharge/i.test(row.from ?? "") || /surcharge/i.test(row.category ?? "") || /surcharge/i.test(row.service ?? "")) return "addon";

  // Only price columns whose header actually looks like a vehicle (a seater
  // count, "Coach", "Minibus", etc.) count as evidence of a transport row.
  // Season-block sheets from OTHER categories — e.g. a hotel rate sheet with
  // "CP"/"MAP" meal-plan columns — also end up with several non-zero priced
  // columns per row, but those column headers don't look like vehicles, so
  // they must never be treated as transport just because they're numeric.
  const genuineVehiclePrices = row.vehiclePrices.filter((v) => matchVehicleColumn(v.header) !== null);

  // Transport: a route (from/to) or a transfer-flavored service, together
  // with at least one genuine per-vehicle price — this is the shape of the
  // sample "Duty Code, A, B, Service, ..., 4 SEATER, 7 SEATER" master file.
  if ((row.from || row.to || looksLikeTransportService(row.service)) && genuineVehiclePrices.length > 0) {
    return "transport";
  }
  // A route with no vehicle columns at all (e.g. a single flat "Price"
  // column instead) is still transport, just modeled with one vehicle.
  if ((row.from || row.to) && (row.flatPrice !== undefined || row.distance || row.startTime)) {
    return "transport";
  }

  // Explicit category/service-type hints, e.g. rows from a dedicated
  // "services.csv" that only has Name/Service Type/Price columns.
  const categoryHint = (row.category ?? row.subcategory ?? row.serviceType ?? row.service ?? "").toLowerCase();
  if (/(add.?on|surcharge|guide|entrance|meal|child seat)/.test(categoryHint)) return "addon";
  if (/hotel|accommodation/.test(categoryHint)) return "hotel";
  if (/activity|tour|excursion|ticket/.test(categoryHint)) return "activity";
  if (/transport|transfer|vehicle/.test(categoryHint)) return "transport";

  if (genuineVehiclePrices.length > 0) return "transport"; // has genuine vehicle-priced columns but nothing else matched — best guess

  return "other";
}

function looksLikeTransportService(service?: string): boolean {
  if (!service) return false;
  return /(pvt|sic|private|transfer|group|coach|shuttle)/i.test(service);
}
