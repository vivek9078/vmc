import { ensureSheet, readSheetRows, withSheetTransaction } from "@/lib/excel";

/**
 * The local-Excel equivalent of the old Google `SheetsTable`. Deliberately
 * mirrors its public method names and behavior 1:1 (list/get/append/
 * updateById/deleteById, same row<->object mapper functions) so every
 * entity repository under `excel/` is nearly a copy of its old `googleSheets/`
 * counterpart with only the import changed — the repository *interfaces*
 * in `../types.ts`, and therefore every server action and page that calls
 * them, needed no changes at all.
 */
export class ExcelTable<T extends { id: string }> {
  constructor(
    private sheetName: string,
    private columns: string[], // column order, written as the header row
    private rowToRecord: (row: string[]) => T,
    private recordToRow: (record: T) => string[]
  ) {
    ensureSheet(this.sheetName, this.columns);
  }

  async list(): Promise<T[]> {
    const rows = readSheetRows(this.sheetName, this.columns);
    return rows.map((r) => this.rowToRecord(r.cells)).filter((r) => Boolean(r.id));
  }

  async get(id: string): Promise<T | null> {
    return (await this.list()).find((r) => r.id === id) ?? null;
  }

  async append(record: T): Promise<T> {
    return withSheetTransaction(this.sheetName, this.columns, (rows) => {
      const nextRows = rows.map((r) => r.cells);
      nextRows.push(this.recordToRow(record));
      return { nextRows, result: record };
    });
  }

  /**
   * Like `append`, but the record is computed from the sheet's current rows
   * *inside* the same locked transaction — use this instead of a separate
   * "compute next ID" read followed by `append()` for any sequential/
   * derived ID (e.g. `BK-2026-000042`, `VNQ-2026-000042-Q1`). Two
   * concurrent `create()` calls that each did their own read-then-append
   * could both read the same "current max" and mint the same ID; funneling
   * ID computation through the write queue like this is what actually
   * closes that race, not just serializing the disk write at the end.
   */
  async appendComputed(computeRecord: (existing: T[]) => T): Promise<T> {
    return withSheetTransaction(this.sheetName, this.columns, (rows) => {
      const existing = rows.map((r) => this.rowToRecord(r.cells));
      const record = computeRecord(existing);
      const nextRows = rows.map((r) => r.cells);
      nextRows.push(this.recordToRow(record));
      return { nextRows, result: record };
    });
  }

  async updateById(id: string, updated: T): Promise<T> {
    return withSheetTransaction(this.sheetName, this.columns, (rows) => {
      const idx = rows.findIndex((r) => this.rowToRecord(r.cells).id === id);
      if (idx === -1) throw new Error(`${this.sheetName} row with id ${id} not found`);
      const nextRows = rows.map((r) => r.cells);
      nextRows[idx] = this.recordToRow(updated);
      return { nextRows, result: updated };
    });
  }

  /** Physically removes the row. Most entities intentionally use a `status: "Inactive"` update instead — prefer that for anything with foreign-key references elsewhere. */
  async deleteById(id: string): Promise<void> {
    return withSheetTransaction(this.sheetName, this.columns, (rows) => {
      const nextRows = rows.filter((r) => this.rowToRecord(r.cells).id !== id).map((r) => r.cells);
      return { nextRows, result: undefined };
    });
  }
}
