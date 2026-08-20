/**
 * Holds the raw text of an uploaded CSV batch between "Preview" and "Confirm
 * Import" so the confirm step doesn't require re-uploading the file. This is
 * an in-memory, single-process store — consistent with the rest of the app's
 * local-Excel storage model (see src/lib/excel.ts), which already assumes
 * one Node process owns `database/data.xlsx`. Entries expire after 30
 * minutes so an abandoned preview doesn't leak memory.
 */

interface PendingImport {
  files: { name: string; text: string }[];
  uploadedByUserId: string;
  uploadedByEmail: string;
  /** When set (from a category-scoped uploader, e.g. the Hotels page), every row is forced to this type instead of being auto-classified — see applyExpectedType in sync.ts. */
  expectedType?: import("@/types/domain").SyncEntityType;
  createdAt: number;
}

const TTL_MS = 30 * 60 * 1000;
const store = new Map<string, PendingImport>();

function sweep() {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (now - entry.createdAt > TTL_MS) store.delete(id);
  }
}

export function savePendingImport(
  files: { name: string; text: string }[],
  uploadedByUserId: string,
  uploadedByEmail: string,
  expectedType?: import("@/types/domain").SyncEntityType
): string {
  sweep();
  const id = `pnd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  store.set(id, { files, uploadedByUserId, uploadedByEmail, expectedType, createdAt: Date.now() });
  return id;
}

export function getPendingImport(id: string): PendingImport | null {
  sweep();
  return store.get(id) ?? null;
}

export function clearPendingImport(id: string): void {
  store.delete(id);
}
