import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
XLSX.set_fs(fs);

/**
 * Local Excel storage engine. This is the entire "database" for the app —
 * every repository in `src/lib/repositories/excel/` reads and writes
 * through the functions here instead of talking to any external service.
 *
 * Design:
 *  - The workbook lives at `database/data.xlsx`, resolved relative to
 *    `DMC_DATA_DIR` when that environment variable is set (used by the
 *    Electron desktop build — see electron/main.js — to keep user data in
 *    the OS's per-user app-data folder instead of the installed app's,
 *    often read-only, Program Files directory), otherwise relative to
 *    `process.cwd()` as before, created automatically on first use.
 *  - The whole workbook is kept in memory once loaded (`cachedWorkbook`),
 *    since it's small (a business's own data, not a data warehouse) and
 *    this avoids re-parsing the file on every read.
 *  - Every mutation goes through `withSheetTransaction`, which serializes
 *    all writes onto a single promise chain (`writeQueue`). This is what
 *    "prevents workbook corruption": two concurrent server actions calling
 *    e.g. `userRepository.create()` at the same time will never both read
 *    the same "current rows" and race to append — the second transaction's
 *    mutator always sees the first transaction's result, because the queue
 *    guarantees they run one at a time, never interleaved.
 *  - Every commit writes to a temp file in the same directory, then
 *    `fs.renameSync`s it over the real file. Rename is atomic on the same
 *    filesystem, so a crash or concurrent read can never observe a
 *    half-written file — you either get the old complete file or the new
 *    complete file, never a corrupt partial one.
 */

const DATABASE_DIR = path.join(process.env.DMC_DATA_DIR || process.cwd(), "database");
const WORKBOOK_PATH = path.join(DATABASE_DIR, "data.xlsx");

/**
 * The 10 sheets requested for the workbook scaffold, with their header
 * rows. Repositories for entities beyond this list (Transport, Activities,
 * Suppliers, History, Payments, RateSheet*) call `ensureSheet` themselves
 * with their own headers the first time they run — `ensureWorkbook` here
 * only guarantees this baseline structure exists from the very first launch,
 * matching the requested workbook layout exactly.
 */
const BASELINE_SHEETS: Record<string, string[]> = {
  Users: ["id", "name", "email", "passwordHash", "roleId", "status", "isSuperAdmin", "failedLoginAttempts", "lockedUntil", "lastLoginAt", "createdAt", "updatedAt"],
  Roles: ["id", "name", "description", "permissionIds", "isSystem", "createdAt", "updatedAt"],
  Permissions: ["id", "label", "group"],
  Hotels: ["id", "name", "city", "starRating", "roomTypes", "amenities", "supplierId", "status", "createdAt", "updatedAt"],
  Customers: ["id", "name", "email", "phone", "notes", "createdAt", "updatedAt"],
  Quotations: ["id", "queryId", "packageName", "status", "hotelLines", "transportLines", "activityLines", "markupPercent", "discountPercent", "gstPercent", "internalComments", "createdAt", "updatedAt"],
  Bookings: ["id", "queryId", "quotationId", "guestName", "destination", "travelDate", "numberOfNights", "packageName", "salesTeamUserId", "costTotal", "sellingTotal", "profit", "status", "confirmedByUserId", "createdAt", "updatedAt"],
  Invoices: ["id", "bookingId", "invoiceNumber", "amount", "status", "issuedAt", "dueAt", "notes", "createdAt", "updatedAt"],
  AuditLogs: ["id", "userId", "userEmail", "action", "entityType", "entityId", "details", "ipAddress", "createdAt"],
  Settings: ["key", "value", "updatedAt"],
};

let cachedWorkbook: XLSX.WorkBook | null = null;

function ensureDatabaseDir(): void {
  if (!fs.existsSync(DATABASE_DIR)) {
    fs.mkdirSync(DATABASE_DIR, { recursive: true });
  }
}

function newEmptySheet(headers: string[]): XLSX.WorkSheet {
  return XLSX.utils.aoa_to_sheet([headers]);
}

/** Loads the workbook into memory, creating the file (with the baseline sheets) if it doesn't exist yet. Safe to call on every request — after the first call it's just returning the cached object. */
function loadWorkbook(): XLSX.WorkBook {
  if (cachedWorkbook) return cachedWorkbook;

  ensureDatabaseDir();

  if (fs.existsSync(WORKBOOK_PATH)) {
    cachedWorkbook = XLSX.readFile(WORKBOOK_PATH, { cellText: true, cellDates: false });
  } else {
    const wb = XLSX.utils.book_new();
    for (const [sheetName, headers] of Object.entries(BASELINE_SHEETS)) {
      XLSX.utils.book_append_sheet(wb, newEmptySheet(headers), sheetName);
    }
    cachedWorkbook = wb;
    persist(wb);
  }

  return cachedWorkbook;
}

/** Atomic save: write to a temp file, then rename over the real one. */
function persist(wb: XLSX.WorkBook): void {
  ensureDatabaseDir();
  const tempPath = path.join(
    DATABASE_DIR,
    `.data.xlsx.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
  );
  XLSX.writeFile(wb, tempPath, { bookType: "xlsx" });
  fs.renameSync(tempPath, WORKBOOK_PATH);
}

/** Idempotently adds a sheet with the given header row if it doesn't already exist. Called by ExcelTable for every entity so the workbook is self-healing — delete a tab by accident and it comes back empty (headers only) on the next write. */
export function ensureSheet(sheetName: string, headers: string[]): void {
  const wb = loadWorkbook();
  if (wb.Sheets[sheetName]) return;
  XLSX.utils.book_append_sheet(wb, newEmptySheet(headers), sheetName);
  persist(wb);
}

/**
 * Reads every data row (row 2 onward — row 1 is always the header) of a
 * sheet as an array of `{ rowNumber, cells }`, where `rowNumber` is the
 * 1-indexed spreadsheet row (so `2` is the first data row) and `cells` is a
 * string array aligned to `headers`, padded with "" for any short/blank
 * trailing cells. Auto-creates the sheet (empty) if it doesn't exist yet.
 */
export function readSheetRows(sheetName: string, headers: string[]): { rowNumber: number; cells: string[] }[] {
  ensureSheet(sheetName, headers);
  const wb = loadWorkbook();
  const sheet = wb.Sheets[sheetName];

  const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, range: 1, blankrows: false, defval: "" });
  return raw.map((row, i) => ({
    rowNumber: i + 2,
    cells: headers.map((_, colIdx) => (row[colIdx] === undefined || row[colIdx] === null ? "" : String(row[colIdx]))),
  }));
}

// ---------------------------------------------------------------------------
// Serialized write queue — the concurrency-safety mechanism.
// ---------------------------------------------------------------------------

let writeQueue: Promise<unknown> = Promise.resolve();

/**
 * Runs `mutator` against the sheet's *current* rows and persists whatever
 * it returns, all inside one link of the write queue — so this whole
 * read -> mutate -> save cycle is atomic with respect to every other
 * transaction on this workbook (on any sheet; the queue is workbook-wide,
 * which is intentionally conservative: cross-sheet operations like
 * "confirm booking" touch Bookings, Quotations, and Queries together and
 * must never interleave with another transaction either).
 *
 * `mutator` receives the current rows (each `string[]` aligned to
 * `headers`) and returns the full replacement row set for that sheet.
 * ExcelTable builds append/update/delete on top of this primitive.
 */
export async function withSheetTransaction<T>(
  sheetName: string,
  headers: string[],
  mutator: (rows: { rowNumber: number; cells: string[] }[]) => { nextRows: string[][]; result: T }
): Promise<T> {
  const task = writeQueue.then(async () => {
    const current = readSheetRows(sheetName, headers);
    const { nextRows, result } = mutator(current);

    const wb = loadWorkbook();
    wb.Sheets[sheetName] = XLSX.utils.aoa_to_sheet([headers, ...nextRows]);
    persist(wb);

    return result;
  });

  // Keep the queue alive even if this task rejects, so one failed write
  // doesn't wedge every subsequent transaction forever.
  writeQueue = task.catch(() => undefined);

  return task;
}

/** Test/ops escape hatch — forces the next read to reload from disk instead of the in-memory cache. Not used by normal request handling. */
export function invalidateWorkbookCache(): void {
  cachedWorkbook = null;
}

export function getWorkbookPath(): string {
  return WORKBOOK_PATH;
}
