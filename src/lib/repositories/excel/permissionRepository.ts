import { ensureSheet, readSheetRows, withSheetTransaction } from "@/lib/excel";
import { PERMISSIONS } from "@/lib/rbac";
import type { PermissionRepository } from "../types";

const COLUMNS = ["id", "label", "group"];
const SHEET_NAME = "Permissions";

type PermissionRow = { id: string; label: string; group: string };

/**
 * Permissions are code, not data (see the interface doc comment in
 * ../types.ts) — this repository never reads its answers from the sheet.
 * It exists so `list()`/`get()`/`find()` work the way every other
 * repository does, and so the Permissions sheet is kept in sync with the
 * code catalog for anyone inspecting the workbook directly.
 */
export class ExcelPermissionRepository implements PermissionRepository {
  constructor() {
    ensureSheet(SHEET_NAME, COLUMNS);
    void this.syncSheetToCatalog();
  }

  private async syncSheetToCatalog(): Promise<void> {
    const current = readSheetRows(SHEET_NAME, COLUMNS).map((r) => r.cells);
    const catalogRows = PERMISSIONS.map((p) => [p.id, p.label, p.group]);
    const inSync =
      current.length === catalogRows.length &&
      current.every((row, i) => row[0] === catalogRows[i][0] && row[1] === catalogRows[i][1] && row[2] === catalogRows[i][2]);
    if (inSync) return;

    await withSheetTransaction<void>(SHEET_NAME, COLUMNS, () => ({ nextRows: catalogRows, result: undefined }));
  }

  async list(): Promise<PermissionRow[]> {
    return PERMISSIONS.map((p) => ({ id: p.id, label: p.label, group: p.group }));
  }

  async getAll(): Promise<PermissionRow[]> {
    return this.list();
  }

  async get(id: string): Promise<PermissionRow | null> {
    return (await this.list()).find((p) => p.id === id) ?? null;
  }

  async find(predicate: (p: PermissionRow) => boolean): Promise<PermissionRow[]> {
    return (await this.list()).filter(predicate);
  }
}
