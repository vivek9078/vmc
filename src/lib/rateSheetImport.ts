import * as XLSX from "xlsx";
import type { RateSheetCategory, RateSheetItem, RateSheetPriceColumn, RateSheetServiceMode } from "@/types/domain";

/**
 * Parses a rate-sheet workbook shaped like the DMC master file: one sheet
 * (tab) per destination/service-mode, a 2-3 row header block where the base
 * field names ("Name", "Service", "Description", ...) are vertically merged
 * down the whole header block, and one or more "Season" blocks to the
 * right — each a horizontally-merged season/date label sitting above a row
 * of individual price-column labels (pax bands or vehicle-size bands).
 *
 * Strategy: fill every merged range with its top-left value so the header
 * block becomes a plain rectangular grid, then diff the header rows against
 * each other to tell "constant down the block" (base fields) apart from
 * "changes between rows" (season label / date range / price column).
 */

export type ParsedCategoryInput = Omit<RateSheetCategory, "id" | "createdAt" | "updatedAt">;
export type ParsedItemInput = Omit<RateSheetItem, "id" | "createdAt" | "updatedAt" | "categoryId"> & {
  categoryName: string;
};

export interface ParseResult {
  categories: ParsedCategoryInput[];
  items: ParsedItemInput[];
  warnings: string[];
}

const BASE_FIELD_ALIASES: Record<string, keyof ParsedItemInput | "name" | "service" | "description"> = {
  name: "name",
  service: "service",
  description: "description",
  "open time": "openTime",
  "close time": "closeTime",
  "duration(min)": "durationMinutes",
  "duration (min)": "durationMinutes",
  "duration(mins)": "durationMinutes",
  "duration (mins)": "durationMinutes",
  slots: "slots",
  distance: "distance",
  "start time": "startTime",
  "day schedule": "daySchedule",
};

function normalize(value: unknown): string {
  return String(value ?? "").trim();
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "") || `col_${Math.random().toString(36).slice(2, 7)}`
  );
}

function guessServiceMode(sheetName: string): RateSheetServiceMode {
  const s = sheetName.toLowerCase();
  if (s.includes("pvt")) return "PVT";
  if (s.includes("sic")) return "SIC";
  if (s.includes("group")) return "Group";
  return "Other";
}

function guessDestination(sheetName: string): string {
  // "Hanoi SIC, Ticket" -> "Hanoi"; "Danang Group , Ticket" -> "Danang"
  const first = sheetName.split(/[,\-]/)[0].trim();
  // Strip trailing service-mode words like "Airport" is part of destination context in this workbook, keep as-is.
  return first.split(" ").slice(0, 2).join(" ").replace(/\s+(PVT|SIC|Group|Tour|Ticket)$/i, "").trim() || sheetName;
}

/** Parses "1 Jan 2026 - 31 Dec 2026" into ISO start/end dates. Returns undefined pair if it doesn't match. */
function parseDateRange(label: string): { startDate?: string; endDate?: string } {
  const parts = label.split(/-|–|to/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 2) return {};
  const parseOne = (s: string) => {
    const d = new Date(s);
    return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
  };
  return { startDate: parseOne(parts[0]), endDate: parseOne(parts[1]) };
}

/** Fills every merged range in the sheet with its top-left value, in place, on a raw AOA grid. */
function fillMerges(grid: unknown[][], merges: XLSX.Range[]) {
  for (const m of merges) {
    const topLeft = grid[m.s.r]?.[m.s.c];
    for (let r = m.s.r; r <= m.e.r; r++) {
      if (!grid[r]) grid[r] = [];
      for (let c = m.s.c; c <= m.e.c; c++) {
        grid[r][c] = topLeft;
      }
    }
  }
}

function findHeaderBlock(grid: unknown[][], merges: XLSX.Range[]): { topRow: number; nameCol: number; height: number } | null {
  for (let r = 0; r < Math.min(grid.length, 10); r++) {
    const row = grid[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      if (normalize(row[c]).toLowerCase() === "name") {
        const merge = merges.find((m) => m.s.r <= r && r <= m.e.r && m.s.c <= c && c <= m.e.c);
        const height = merge ? merge.e.r - merge.s.r + 1 : 1;
        return { topRow: merge ? merge.s.r : r, nameCol: c, height: Math.max(height, 1) };
      }
    }
  }
  return null;
}

/**
 * Shared header-block-to-category logic, used for both .xlsx sheets (where
 * merged cells have already been flattened by fillMerges) and .csv grids
 * (where reconstructMerges below plays the same role). Everything from this
 * point on treats the grid as a plain rectangular block, so both formats
 * share exactly the same column classification and row extraction.
 */
function buildCategoryFromGrid(
  categoryName: string,
  grid: unknown[][],
  topRow: number,
  nameCol: number,
  height: number
): { category: ParsedCategoryInput; items: ParsedItemInput[]; warnings: string[] } | null {
  const warnings: string[] = [];
  const sheetName = categoryName;
  const bottomHeaderRow = topRow + height - 1;
  const dataStartRow = topRow + height;

  // Walk columns left-to-right from nameCol. A column is a "base field" if its
  // value is identical across every row of the header block (it was vertically
  // merged); otherwise it's a price column belonging to a season group.
  const totalCols = Math.max(...grid.map((row) => row.length), 0);

  const baseFieldCols: { col: number; key: string }[] = [];
  const priceCols: { col: number; seasonKey: string; seasonLabel: string; columnLabel: string }[] = [];

  let c = nameCol;
  for (; c < totalCols; c++) {
    const valuesInBlock = Array.from({ length: height }, (_, i) => normalize(grid[topRow + i]?.[c]));
    const isConstant = valuesInBlock.every((v) => v === valuesInBlock[0]);
    const label = valuesInBlock[0];
    if (!label) continue;

    if (isConstant) {
      const key = BASE_FIELD_ALIASES[label.toLowerCase()];
      if (key) baseFieldCols.push({ col: c, key });
      // Unrecognized constant columns (e.g. a leading duty-code column) are skipped.
      continue;
    }

    // Season/date rows are everything above the bottom header row; the bottom
    // row holds the actual price-column label (Adult, 16 Seater, ...).
    const rawSeasonLabelParts = Array.from({ length: height - 1 }, (_, i) => normalize(grid[topRow + i]?.[c])).filter(Boolean);
    // Reconstructed (unmerged) CSV grids can repeat the same value down a
    // column where a merge used to span rows — collapse consecutive repeats.
    const seasonLabelParts = rawSeasonLabelParts.filter((v, i) => v !== rawSeasonLabelParts[i - 1]);
    const seasonLabel = seasonLabelParts.join(" ").replace(/\s+/g, " ").trim() || "Season";
    const columnLabel = normalize(grid[bottomHeaderRow]?.[c]);
    if (!columnLabel) continue;
    priceCols.push({ col: c, seasonKey: seasonLabel, seasonLabel, columnLabel });
  }

  if (baseFieldCols.every((f) => f.key !== "name")) {
    // nameCol itself should always be included — guard just in case aliasing missed it.
    baseFieldCols.unshift({ col: nameCol, key: "name" });
  }

  // Build the category's price columns, deduped, in first-seen order.
  const priceColumns: RateSheetPriceColumn[] = [];
  const seenColIds = new Set<string>();
  for (const p of priceCols) {
    const id = slugify(p.columnLabel);
    if (!seenColIds.has(id)) {
      seenColIds.add(id);
      priceColumns.push({ id, label: p.columnLabel });
    }
  }

  if (priceColumns.length === 0) {
    warnings.push(`Sheet "${sheetName}": no price columns detected under a "Season" header — skipped.`);
    return null;
  }

  // Group price columns into season blocks by their season label (handles
  // multiple side-by-side season date ranges on the same tab).
  const seasonGroups = new Map<string, { label: string; cols: { col: number; columnId: string }[] }>();
  for (const p of priceCols) {
    const id = slugify(p.columnLabel);
    const group = seasonGroups.get(p.seasonKey) ?? { label: p.seasonLabel, cols: [] };
    group.cols.push({ col: p.col, columnId: id });
    seasonGroups.set(p.seasonKey, group);
  }

  const category: ParsedCategoryInput = {
    name: sheetName.trim(),
    destination: guessDestination(sheetName),
    serviceMode: guessServiceMode(sheetName),
    priceColumns,
  };

  const items: ParsedItemInput[] = [];
  for (let r = dataStartRow; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const name = normalize(row[nameCol]);
    if (!name) continue; // blank spacer row

    const item: Partial<ParsedItemInput> & { name: string; categoryName: string } = {
      categoryName: sheetName.trim(),
      name,
      service: "",
      seasons: [],
      status: "Active",
    };

    for (const f of baseFieldCols) {
      const raw = row[f.col];
      if (f.key === "durationMinutes") {
        const n = Number(raw);
        if (!isNaN(n) && raw !== "") (item as Record<string, unknown>)[f.key] = n;
      } else if (f.key !== "name") {
        const v = normalize(raw);
        if (v) (item as Record<string, unknown>)[f.key] = v;
      }
    }

    const seasons = Array.from(seasonGroups.entries()).map(([, group], idx) => {
      const prices: Record<string, number> = {};
      for (const { col, columnId } of group.cols) {
        const n = Number(row[col]);
        prices[columnId] = isNaN(n) ? 0 : n;
      }
      return {
        id: `season_${idx + 1}`,
        label: group.label,
        ...parseDateRange(group.label),
        prices,
      };
    });

    item.seasons = seasons;
    items.push(item as ParsedItemInput);
  }

  return { category, items, warnings };
}

function parseSheet(sheetName: string, ws: XLSX.WorkSheet): { category: ParsedCategoryInput; items: ParsedItemInput[]; warnings: string[] } | null {
  const grid: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
  const merges = (ws["!merges"] ?? []) as XLSX.Range[];

  fillMerges(grid, merges);

  const header = findHeaderBlock(grid, merges);
  if (!header) return null; // Not a rate-sheet-shaped tab — skip silently.

  return buildCategoryFromGrid(sheetName.trim(), grid, header.topRow, header.nameCol, header.height);
}

/** Turns an uploaded CSV's file name into a category name: strips the extension and tidies separators left by download tools (e.g. "Final_Transfer_PVT__Tour.csv" -> "Final Transfer PVT Tour"). */
export function filenameToCategoryName(filename: string): string {
  return filename
    .replace(/\.(csv|txt)$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * CSV has no merged cells, so a flattened rate-sheet header (base fields
 * vertically "merged" down the block, season/date labels horizontally
 * merged across their price columns) arrives with only the top-left cell of
 * each former merge populated and the rest blank. This reconstructs that
 * shape in place: first a left-to-right fill across each header row (undoes
 * horizontal merges), then a top-to-bottom fill down each column (undoes
 * vertical merges) — mirroring what fillMerges does for .xlsx sheets.
 */
function reconstructMerges(grid: unknown[][], dataStartRow: number) {
  const totalCols = Math.max(...grid.slice(0, dataStartRow).map((row) => row.length), 0);

  for (let r = 0; r < dataStartRow; r++) {
    const row = (grid[r] ??= []);
    let last: unknown = undefined;
    for (let c = 0; c < totalCols; c++) {
      if (normalize(row[c])) {
        last = row[c];
      } else if (last !== undefined) {
        row[c] = last;
      }
    }
  }

  for (let c = 0; c < totalCols; c++) {
    let last: unknown = undefined;
    for (let r = 0; r < dataStartRow; r++) {
      const row = (grid[r] ??= []);
      if (normalize(row[c])) {
        last = row[c];
      } else if (last !== undefined) {
        row[c] = last;
      }
    }
  }
}

/** Finds the item-name column: a literal "Name" header if present, otherwise the first labeled column after a leading code/ID column (matches the DMC template's "Duty Code, Name, ..." layout). */
function findNameColCsv(grid: unknown[][]): number {
  for (let r = 0; r < Math.min(grid.length, 6); r++) {
    const row = grid[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      if (normalize(row[c]).toLowerCase() === "name") return c;
    }
  }
  const row0 = grid[0] ?? [];
  if (normalize(row0[1])) return 1;
  for (let c = 0; c < row0.length; c++) {
    if (normalize(row0[c])) return c;
  }
  return 0;
}

function parseCsvGrid(categoryName: string, grid: unknown[][]): { category: ParsedCategoryInput; items: ParsedItemInput[]; warnings: string[] } | null {
  if (grid.length === 0) return null;
  const nameCol = findNameColCsv(grid);

  // The header block ends at the first row (after row 0) that actually has
  // a value in the name column — every header sub-row (season label, date
  // range, blank spacer, price-column labels) leaves that column blank.
  let dataStartRow = grid.length;
  for (let r = 1; r < grid.length; r++) {
    if (normalize(grid[r]?.[nameCol])) {
      dataStartRow = r;
      break;
    }
  }
  if (dataStartRow >= grid.length) return null; // No data rows found — not a rate-sheet-shaped file.

  reconstructMerges(grid, dataStartRow);

  return buildCategoryFromGrid(categoryName, grid, 0, nameCol, dataStartRow);
}

/** Parses one or more rate-sheet CSV exports — one file per category/tab, matching the same layout as a tab in the master .xlsx workbook. */
export function parseRateSheetCSVFiles(files: { name: string; text: string }[]): ParseResult {
  const categories: ParsedCategoryInput[] = [];
  const items: ParsedItemInput[] = [];
  const warnings: string[] = [];

  for (const file of files) {
    try {
      const categoryName = filenameToCategoryName(file.name);
      const workbook = XLSX.read(file.text, { type: "string" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        warnings.push(`"${file.name}": file appears to be empty — skipped.`);
        continue;
      }
      const grid: unknown[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: "" });
      const result = parseCsvGrid(categoryName, grid);
      if (!result) {
        warnings.push(`"${file.name}": no recognizable rate-sheet layout found (expected a Name column and a Season block of price columns) — skipped.`);
        continue;
      }
      categories.push(result.category);
      items.push(...result.items);
      warnings.push(...result.warnings.map((w) => `"${file.name}": ${w}`));
    } catch {
      warnings.push(`"${file.name}": could not be read — is it a valid CSV file?`);
    }
  }

  if (categories.length === 0 && warnings.length === 0) {
    warnings.push("No recognizable rate-sheet CSV files found. Expected a Name column and a Season block of price columns.");
  }

  return { categories, items, warnings };
}

export function parseRateSheetWorkbook(buffer: ArrayBuffer | Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const categories: ParsedCategoryInput[] = [];
  const items: ParsedItemInput[] = [];
  const warnings: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const result = parseSheet(sheetName, ws);
    if (!result) continue;
    categories.push(result.category);
    items.push(...result.items);
    warnings.push(...result.warnings);
  }

  if (categories.length === 0) {
    warnings.push("No recognizable rate-sheet tabs found. Expected a header row with a \"Name\" column and a \"Season\" block above price columns.");
  }

  return { categories, items, warnings };
}
