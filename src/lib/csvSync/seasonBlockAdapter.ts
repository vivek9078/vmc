import { parseRateSheetCSVFiles, type ParsedCategoryInput, type ParsedItemInput } from "@/lib/rateSheetImport";
import { classifyRow } from "./classify";
import type { NormalizedRow, VehiclePrice } from "./types";

/**
 * The real master files (spec section 22's "Duty Code, A, B, Service, ...,
 * 4 SEATER, 7 SEATER" example) aren't a single flat header row — the
 * per-vehicle price labels sit on their own row below a season/date-range
 * row, exactly the "Season block" layout `parseRateSheetCSVFiles`
 * (rateSheetImport.ts) already parses correctly for the Rate Sheet portal.
 * Rather than re-implement that multi-row-header reconstruction, CSV Sync
 * reuses it and converts its output into normalized rows — one per
 * (item × season) with every non-zero price column collected into
 * `vehiclePrices`, ready for the same classify/plan/commit pipeline as any
 * other CSV shape.
 */
export function convertSeasonBlockFile(fileName: string, categories: ParsedCategoryInput[], items: ParsedItemInput[]): NormalizedRow[] {
  const columnLabelById = new Map<string, Map<string, string>>();
  for (const category of categories) {
    columnLabelById.set(category.name, new Map(category.priceColumns.map((pc) => [pc.id, pc.label])));
  }

  const rows: NormalizedRow[] = [];
  let rowNumber = 1;

  for (const item of items) {
    const labelsForCategory = columnLabelById.get(item.categoryName) ?? new Map<string, string>();

    for (const season of item.seasons) {
      rowNumber += 1;
      const vehiclePrices: VehiclePrice[] = [];
      for (const [columnId, price] of Object.entries(season.prices)) {
        if (!price || price <= 0) continue;
        const label = labelsForCategory.get(columnId) ?? columnId;
        const capacityMatch = label.match(/(\d+)/);
        vehiclePrices.push({ header: label, vehicleLabel: label, capacity: capacityMatch ? Number(capacityMatch[1]) : 0, price });
      }
      if (vehiclePrices.length === 0) continue; // this season had no priced columns for this item — nothing to sync

      const row: NormalizedRow = {
        rowNumber,
        sourceFile: fileName,
        type: "other",
        from: item.name,
        service: item.service || undefined,
        distance: item.distance,
        startTime: item.startTime,
        duration: item.durationMinutes !== undefined ? String(item.durationMinutes) : undefined,
        daySchedule: item.daySchedule,
        season: season.label,
        description: item.description,
        vehiclePrices,
        customFields: {},
        originalData: {
          Name: item.name, Service: item.service ?? "", Season: season.label,
          ...(item.distance ? { Distance: item.distance } : {}),
          ...(item.startTime ? { "Start Time": item.startTime } : {}),
          ...(item.daySchedule ? { "Day Schedule": item.daySchedule } : {}),
        },
      };
      // Classify BEFORE filling in the flatPrice fallback below — a
      // synthetic flatPrice must never itself be evidence of "this is a
      // transport row" (that's `vehiclePrices` alone, filtered to genuine
      // vehicle-shaped columns inside classifyRow), or every season-block
      // sheet with any priced column would misclassify as transport again.
      row.type = classifyRow(row);

      // Fallback for whichever entity type this row ends up classified as:
      // `planTransportRow` reads every entry in `vehiclePrices` (one line
      // per vehicle), but `planHotelRow` and `planActivityRow` only ever
      // look at `flatPrice` — without this, a hotel/activity season-block
      // sheet (e.g. "CP"/"MAP" meal-plan columns instead of vehicle
      // columns) would import at $0 even once correctly classified,
      // silently losing its pricing.
      if (row.type !== "transport") {
        row.flatPrice = Math.max(...vehiclePrices.map((v) => v.price));
      }

      rows.push(row);
    }
  }

  return rows;
}

/**
 * Tries the season-block layout first (the real master-sheet shape); if a
 * file doesn't match it at all (e.g. a plain single-header hotel or add-on
 * list), `parseRateSheetCSVFiles` returns nothing for it and the caller
 * falls back to the flat single-header parser instead.
 */
export function tryParseSeasonBlockFiles(files: { name: string; text: string }[]): { byFile: Map<string, NormalizedRow[]>; warnings: string[] } {
  const { categories, items, warnings } = parseRateSheetCSVFiles(files);
  const byFile = new Map<string, NormalizedRow[]>();

  const itemsByCategory = new Map<string, ParsedItemInput[]>();
  for (const item of items) {
    const list = itemsByCategory.get(item.categoryName) ?? [];
    list.push(item);
    itemsByCategory.set(item.categoryName, list);
  }

  for (const category of categories) {
    // parseRateSheetCSVFiles names each category after its source file (via filenameToCategoryName),
    // so category.name maps 1:1 back to the uploaded file that produced it.
    const sourceFile = files.find((f) => f.name.replace(/\.(csv|txt)$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim() === category.name)?.name
      ?? category.name;
    const categoryItems = itemsByCategory.get(category.name) ?? [];
    byFile.set(sourceFile, convertSeasonBlockFile(sourceFile, [category], categoryItems));
  }

  return { byFile, warnings };
}
