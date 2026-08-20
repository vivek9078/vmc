import * as XLSX from "xlsx";
import { classifyHeaders } from "./columnMap";
import { classifyRow } from "./classify";
import { tryParseSeasonBlockFiles } from "./seasonBlockAdapter";
import type { NormalizedRow, ParsedCsvResult, VehiclePrice } from "./types";

function normalize(value: unknown): string {
  return String(value ?? "").trim();
}

function parseNumberCell(value: unknown): number | undefined {
  const s = normalize(value).replace(/,/g, "").replace(/[^\d.-]/g, "");
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** Finds the header row: the first row with at least two non-empty cells (CSVs sometimes carry a title row above the real header). Scans only the first 5 rows to stay cheap. */
function findHeaderRow(grid: unknown[][]): number {
  for (let r = 0; r < Math.min(grid.length, 5); r++) {
    const row = grid[r] ?? [];
    const nonEmpty = row.filter((c) => normalize(c)).length;
    if (nonEmpty >= 2) return r;
  }
  return 0;
}

/**
 * Parses one flat, single-header-row CSV (the "Duty Code, A, B, Service, ...,
 * 4 SEATER, 7 SEATER, ..." master-sheet export shape) into normalized rows,
 * ready for classification and sync. This is deliberately separate from
 * `parseRateSheetCSVFiles` (rateSheetImport.ts), which handles the older
 * multi-row "Season block" workbook layout — that importer keeps working
 * unchanged; this one is what makes CSV Sync work with the simpler,
 * single-header export format described in the sync spec.
 */
export function parseCsvForSync(fileName: string, text: string): ParsedCsvResult {
  const issues: ParsedCsvResult["issues"] = [];
  const rows: NormalizedRow[] = [];

  let grid: unknown[][];
  try {
    const workbook = XLSX.read(text, { type: "string" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { fileName, rows, issues: [{ rowNumber: 0, message: "File appears to be empty." }] };
    grid = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: "" });
  } catch {
    return { fileName, rows, issues: [{ rowNumber: 0, message: "Could not read this file — is it a valid CSV?" }] };
  }

  if (grid.length === 0) return { fileName, rows, issues: [{ rowNumber: 0, message: "File appears to be empty." }] };

  const headerRowIdx = findHeaderRow(grid);
  const headers = (grid[headerRowIdx] ?? []).map((h) => normalize(h));
  if (headers.filter(Boolean).length === 0) {
    return { fileName, rows, issues: [{ rowNumber: headerRowIdx + 1, message: "No column headers found." }] };
  }
  const classified = classifyHeaders(headers);

  for (let r = headerRowIdx + 1; r < grid.length; r++) {
    const rawRow = grid[r] ?? [];
    const originalData: Record<string, string> = {};
    let anyValue = false;
    for (let c = 0; c < headers.length; c++) {
      const v = normalize(rawRow[c]);
      if (headers[c]) originalData[headers[c]] = v;
      if (v) anyValue = true;
    }
    if (!anyValue) continue; // skip fully blank rows silently — not a data-loss risk, nothing was there

    const normRow: NormalizedRow = {
      rowNumber: r + 1,
      sourceFile: fileName,
      type: "other",
      vehiclePrices: [],
      customFields: {},
      originalData,
    };

    const vehiclePrices: VehiclePrice[] = [];
    let flatPrice: number | undefined;

    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];
      if (!header) continue;
      const cellValue = normalize(rawRow[c]);
      const info = classified[c];

      if (info.vehicle) {
        const price = parseNumberCell(rawRow[c]);
        if (price !== undefined && price > 0) {
          vehiclePrices.push({ header: info.vehicle.header, vehicleLabel: info.vehicle.vehicleLabel, capacity: info.vehicle.capacity, price });
        }
        continue;
      }

      if (!info.baseField) {
        if (cellValue) normRow.customFields[header] = cellValue;
        continue;
      }

      switch (info.baseField) {
        case "dutyCode": normRow.dutyCode = cellValue || undefined; break;
        case "from": normRow.from = cellValue || undefined; break;
        case "to": normRow.to = cellValue || undefined; break;
        case "service": normRow.service = cellValue || undefined; break;
        case "serviceType": normRow.serviceType = cellValue || undefined; break;
        case "transferType": normRow.transferType = cellValue || undefined; break;
        case "distance": normRow.distance = cellValue || undefined; break;
        case "startTime": normRow.startTime = cellValue || undefined; break;
        case "duration": normRow.duration = cellValue || undefined; break;
        case "daySchedule": normRow.daySchedule = cellValue || undefined; break;
        case "schedule": normRow.schedule = cellValue || undefined; break;
        case "operatingDays": normRow.operatingDays = cellValue || undefined; break;
        case "season": normRow.season = cellValue || undefined; break;
        case "supplier": normRow.supplier = cellValue || undefined; break;
        case "category": normRow.category = cellValue || undefined; break;
        case "subcategory": normRow.subcategory = cellValue || undefined; break;
        case "tourType": normRow.tourType = cellValue || undefined; break;
        case "description": normRow.description = cellValue || undefined; break;
        case "hotelName": normRow.hotelName = cellValue || undefined; break;
        case "hotelCategory": normRow.hotelCategory = cellValue || undefined; break;
        case "location": normRow.location = cellValue || undefined; break;
        case "city": normRow.city = cellValue || undefined; break;
        case "area": normRow.area = cellValue || undefined; break;
        case "roomType": normRow.roomType = cellValue || undefined; break;
        case "mealPlan": normRow.mealPlan = cellValue || undefined; break;
        case "activityName": normRow.activityName = cellValue || undefined; break;
        case "tourName": normRow.tourName = cellValue || undefined; break;
        case "guide": normRow.guide = cellValue || undefined; break;
        case "addonName": normRow.addonName = cellValue || undefined; break;
        case "genericName": normRow.genericName = cellValue || undefined; break;
        case "currency": normRow.currency = cellValue || undefined; break;
        case "price":
        case "rate": {
          const n = parseNumberCell(rawRow[c]);
          if (n !== undefined) flatPrice = n;
          break;
        }
      }
    }

    normRow.vehiclePrices = vehiclePrices;
    normRow.flatPrice = flatPrice;
    normRow.type = classifyRow(normRow);

    if (normRow.type === "other") {
      issues.push({ rowNumber: normRow.rowNumber, message: "Could not determine whether this row is a hotel, transport, activity, or add-on — needs review." });
    }

    rows.push(normRow);
  }

  return { fileName, rows, issues };
}

export function parseCsvFilesForSync(files: { name: string; text: string }[]): { results: ParsedCsvResult[]; totalRows: number } {
  // Try the multi-row "Season block" layout first (the real master-sheet
  // shape — see seasonBlockAdapter.ts) across all files in one pass, since
  // that parser already groups by category/file internally.
  const { byFile, warnings: seasonWarnings } = tryParseSeasonBlockFiles(files);

  const results: ParsedCsvResult[] = files.map((file) => {
    const seasonRows = byFile.get(file.name);
    if (seasonRows && seasonRows.length > 0) {
      const fileWarnings = seasonWarnings.filter((w) => w.startsWith(`"${file.name}"`));
      return {
        fileName: file.name,
        rows: seasonRows,
        issues: [
          ...fileWarnings.map((w) => ({ rowNumber: 0, message: w })),
          ...seasonRows.filter((r) => r.type === "other").map((r) => ({ rowNumber: r.rowNumber, message: "Could not determine whether this row is a hotel, transport, activity, or add-on — needs review." })),
        ],
      };
    }
    // Not season-block shaped (or nothing usable came out of it) — fall back to the flat single-header parser.
    return parseCsvForSync(file.name, file.text);
  });

  const totalRows = results.reduce((sum, r) => sum + r.rows.length, 0);
  return { results, totalRows };
}
