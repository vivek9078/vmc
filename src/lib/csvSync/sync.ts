import { hotelRepository, transportRepository, activityRepository, addOnRepository, supplierRepository } from "@/lib/repositories";
import type { AddOnItem, Hotel, ImportEntityCounts, SyncEntityType, TransportItem, ActivityItem, Supplier } from "@/types/domain";
import type { NormalizedRow } from "./types";
import { matchVehicleColumn } from "./columnMap";

/**
 * Forces every row to one type instead of relying on auto-classification —
 * used by the category-scoped uploaders on the Hotels/Transport/Activities/
 * Add-ons pages, so a file uploaded from "Hotels" is never accidentally
 * split across categories by a misread row. The general Import Center
 * upload (no expectedType) still auto-classifies per row.
 */
export function applyExpectedType(rows: NormalizedRow[], expectedType: SyncEntityType): NormalizedRow[] {
  return rows.map((row) => ({ ...row, type: expectedType }));
}

const ENTITY_TYPE_LABEL: Record<SyncEntityType, string> = {
  hotel: "Hotel", transport: "Transport", activity: "Activity", addon: "Add-on",
};
const ENTITY_PAGE_LABEL: Record<SyncEntityType, string> = {
  hotel: "Hotels", transport: "Transport", activity: "Activities", addon: "Add-ons",
};

export type ExpectedTypeCheck = { ok: true } | { ok: false; error: string };

/**
 * Guards the category-scoped uploaders (Hotels/Transport/Activities/Add-ons
 * pages) against a file uploaded to the wrong inventory. Previously
 * `applyExpectedType` blindly relabeled every row to match the page it was
 * uploaded from, so e.g. a Hotel CSV dropped onto the Transport page would
 * be silently accepted and written as (mostly nonsensical) transport
 * records. This checks what the rows actually auto-classify as (before
 * `applyExpectedType` overwrites that) and blocks the import if none of
 * them look like the expected type.
 */
export function checkExpectedType(rows: NormalizedRow[], expectedType: SyncEntityType): ExpectedTypeCheck {
  const classified = rows.filter((r) => r.type !== "other");

  if (classified.length === 0) {
    // Nothing auto-classified with confidence either way. For most types
    // that's fine — a minimal "Name, Price" file is a legitimate shape for
    // a Hotel/Activity/Add-on upload, so let the per-row "needs review"
    // skip handle it. Transport is the exception: a season-block sheet
    // from ANY category (hotel, activity, ...) still carries a named item
    // plus several priced columns per row, which superficially resembles
    // the transport shape even with zero actual route/vehicle data — that
    // resemblance is exactly what let a Hotel rate sheet get accepted onto
    // the Transport page. So Transport specifically requires real evidence
    // (a route, a genuine vehicle-priced column, or transport-flavored
    // text) before an all-"other" file is allowed through.
    if (expectedType === "transport" && !rows.some(hasTransportEvidence)) {
      return {
        ok: false,
        error: "This doesn't look like Transport data — none of the rows have a route (From/To) or vehicle-priced columns (e.g. \"4 Seater\", \"Coach\"). Double-check you're uploading the right file.",
      };
    }
    return { ok: true };
  }

  const counts = new Map<SyncEntityType, number>();
  for (const row of classified) {
    const t = row.type as SyncEntityType;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }

  if ((counts.get(expectedType) ?? 0) > 0) return { ok: true }; // at least some rows genuinely look like this type — mixed files are legitimate

  // None of the rows look like the expected type — figure out what they do look like, for a helpful message.
  let bestType: SyncEntityType = expectedType;
  let bestCount = 0;
  for (const [type, count] of counts) {
    if (count > bestCount) { bestType = type; bestCount = count; }
  }

  return {
    ok: false,
    error: `This looks like a ${ENTITY_TYPE_LABEL[bestType]} CSV, not ${ENTITY_TYPE_LABEL[expectedType]}. Upload it from the ${ENTITY_PAGE_LABEL[bestType]} page instead, or use the general Import Center if the file genuinely mixes several inventory types.`,
  };
}

function looksLikeTransportService(service?: string): boolean {
  if (!service) return false;
  return /(pvt|sic|private|transfer|group|coach|shuttle)/i.test(service);
}

/** Mirrors the positive evidence `classifyRow` requires for "transport" — a route, a genuine vehicle-priced column, transport-flavored service text, or distance/start-time. Used to gate an all-"other" file before it's forced onto the Transport page (see `checkExpectedType`). */
function hasTransportEvidence(row: NormalizedRow): boolean {
  const genuineVehiclePrices = row.vehiclePrices.filter((v) => matchVehicleColumn(v.header) !== null);
  if ((row.from || row.to || looksLikeTransportService(row.service)) && genuineVehiclePrices.length > 0) return true;
  if ((row.from || row.to) && (row.distance || row.startTime)) return true;
  return false;
}

function norm(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function zeroCounts(): ImportEntityCounts {
  return { hotel: 0, transport: 0, activity: 0, addon: 0 };
}

/** Caches supplier lookups for the duration of one import so the same "Supplier" column value across hundreds of rows resolves to one record instead of N. */
export class SupplierCache {
  private byName = new Map<string, Supplier>();
  private loaded = false;

  private async ensureLoaded() {
    if (this.loaded) return;
    const all = await supplierRepository.list();
    for (const s of all) this.byName.set(norm(s.name), s);
    this.loaded = true;
  }

  async resolve(supplierName: string | undefined): Promise<Supplier> {
    await this.ensureLoaded();
    const name = supplierName?.trim() || "CSV Import";
    const key = norm(name);
    const existing = this.byName.get(key);
    if (existing) return existing;
    const created = await supplierRepository.create({
      name, company: name, phone: "", email: "", country: "",
      internalNotes: "Auto-created by CSV Sync — review contact details.",
    });
    this.byName.set(key, created);
    return created;
  }
}

export type PlanAction = "create" | "update";

export interface PlanItem {
  rowNumber: number;
  entityType: SyncEntityType;
  action: PlanAction;
  label: string; // human-readable summary for the preview table, e.g. "PQC Airport → Center Phu Quoc (4 Seater)"
  entityId?: string; // set for "update"
  supplierName?: string; // from the row's "Supplier" column, if any — resolved/created via SupplierCache at commit time
  /** Only the fields this import is writing (not the whole record) — used both for previousValue snapshots and as the diff shown in preview. */
  changedFields: Record<string, unknown>;
}

export interface SyncPlanResult {
  items: PlanItem[];
  skipped: { rowNumber: number; message: string }[];
}

/** Builds the full create/update plan for a batch of normalized rows. Read-only — used as-is for the preview, and re-used by `commitPlan` right before writing so preview and commit can never disagree. */
export async function planRows(rows: NormalizedRow[]): Promise<SyncPlanResult> {
  const items: PlanItem[] = [];
  const skipped: SyncPlanResult["skipped"] = [];

  for (const row of rows) {
    try {
      if (row.type === "transport") {
        items.push(...(await planTransportRow(row)));
      } else if (row.type === "hotel") {
        const item = await planHotelRow(row);
        if (item) items.push(item); else skipped.push({ rowNumber: row.rowNumber, message: "Hotel row missing a usable name — needs review." });
      } else if (row.type === "activity") {
        const item = await planActivityRow(row);
        if (item) items.push(item); else skipped.push({ rowNumber: row.rowNumber, message: "Activity row missing a usable name — needs review." });
      } else if (row.type === "addon") {
        const item = await planAddOnRow(row);
        if (item) items.push(item); else skipped.push({ rowNumber: row.rowNumber, message: "Add-on row missing a usable name — needs review." });
      } else {
        skipped.push({ rowNumber: row.rowNumber, message: "Could not determine what kind of record this row represents — needs review." });
      }
    } catch (err) {
      skipped.push({ rowNumber: row.rowNumber, message: err instanceof Error ? err.message : "Unexpected error while reading this row." });
    }
  }

  return { items, skipped };
}

async function planTransportRow(row: NormalizedRow): Promise<PlanItem[]> {
  const from = row.from ?? "";
  const to = row.to ?? "";
  const service = row.service ?? row.transferType ?? "";
  const season = row.season ?? "";
  const vehicles = row.vehiclePrices.length > 0
    ? row.vehiclePrices
    : row.flatPrice !== undefined
      ? [{ header: "Price", vehicleLabel: "Standard", capacity: 0, price: row.flatPrice }]
      : [];

  const results: PlanItem[] = [];
  for (const v of vehicles) {
    const syncKey = row.dutyCode
      ? `dutycode:${norm(row.dutyCode)}|${norm(v.vehicleLabel)}`
      : `from:${norm(from)}|to:${norm(to)}|service:${norm(service)}|vehicle:${norm(v.vehicleLabel)}|season:${norm(season)}`;

    const existing = row.dutyCode
      ? await transportRepository.findByDutyCode(row.dutyCode, v.vehicleLabel)
      : await transportRepository.findBySyncKey(syncKey);

    const changedFields: Record<string, unknown> = {
      vehicleType: v.vehicleLabel, capacity: v.capacity, pickup: from, drop: to,
      cost: v.price, selling: v.price,
      service: service || undefined, distance: row.distance, startTime: row.startTime,
      daySchedule: row.daySchedule, season: season || undefined, dutyCode: row.dutyCode, syncKey,
    };

    results.push({
      rowNumber: row.rowNumber,
      entityType: "transport",
      action: existing ? "update" : "create",
      label: `${from || "?"} → ${to || "?"} (${v.vehicleLabel})`,
      entityId: existing?.id,
      supplierName: row.supplier,
      changedFields,
    });
  }
  return results;
}

async function planHotelRow(row: NormalizedRow): Promise<PlanItem | null> {
  const name = (row.hotelName || row.genericName || row.from)?.trim();
  if (!name) return null;
  const city = (row.city || row.location || "").trim();
  const syncKey = `${norm(name)}|${norm(city)}`;

  const duplicates = await hotelRepository.findPossibleDuplicates(name, city);
  const existing = duplicates[0] ?? null;

  const price = row.flatPrice ?? 0;
  const changedFields: Record<string, unknown> = {
    name, city,
    area: row.area, roomType: row.roomType, mealPlan: row.mealPlan, season: row.season || undefined,
    dutyCode: row.dutyCode, syncKey,
    ...(price > 0 ? { supplierCost: price, sellingCost: price } : {}),
    ...(row.roomType ? { roomTypes: [row.roomType] } : {}),
    ...(row.mealPlan ? { mealPlans: [row.mealPlan] } : {}),
  };

  return {
    rowNumber: row.rowNumber,
    entityType: "hotel",
    action: existing ? "update" : "create",
    label: `${name}${city ? ` — ${city}` : ""}`,
    entityId: existing?.id,
    supplierName: row.supplier,
    changedFields,
  };
}

async function planActivityRow(row: NormalizedRow): Promise<PlanItem | null> {
  const name = (row.activityName || row.tourName || row.genericName || row.from)?.trim();
  if (!name) return null;
  const city = (row.city || row.location || "").trim();
  const syncKey = `${norm(name)}|${norm(city)}`;

  const existing = await activityRepository.findBySyncKey(syncKey);
  const price = row.flatPrice ?? 0;
  const changedFields: Record<string, unknown> = {
    name, city,
    duration: row.duration || row.schedule || "",
    operatingDays: row.operatingDays ? row.operatingDays.split(/[,/]/).map((d) => d.trim()).filter(Boolean) : undefined,
    service: row.service, startTime: row.startTime, season: row.season || undefined,
    dutyCode: row.dutyCode, syncKey, remarks: row.description,
    ...(price > 0 ? { cost: price, selling: price } : {}),
  };

  return {
    rowNumber: row.rowNumber,
    entityType: "activity",
    action: existing ? "update" : "create",
    label: `${name}${city ? ` — ${city}` : ""}`,
    entityId: existing?.id,
    supplierName: row.supplier,
    changedFields,
  };
}

async function planAddOnRow(row: NormalizedRow): Promise<PlanItem | null> {
  const name = (row.addonName || row.activityName || row.hotelName || row.genericName || row.from)?.trim();
  if (!name) return null;
  const serviceType = row.serviceType || row.category || "";
  const syncKey = `${norm(name)}|${norm(serviceType)}`;

  const existing = await addOnRepository.findBySyncKey(syncKey);
  const price = row.flatPrice ?? row.vehiclePrices[0]?.price ?? 0;
  const changedFields: Record<string, unknown> = {
    name, serviceType: serviceType || undefined, description: row.description,
    price, currency: row.currency, vehicleType: row.vehiclePrices[0]?.vehicleLabel,
    duration: row.duration, startTime: row.startTime, distance: row.distance,
    schedule: row.schedule || row.daySchedule, season: row.season || undefined,
    dutyCode: row.dutyCode, syncKey,
  };

  return {
    rowNumber: row.rowNumber,
    entityType: "addon",
    action: existing ? "update" : "create",
    label: name,
    entityId: existing?.id,
    supplierName: row.supplier,
    changedFields,
  };
}

export interface CommitOutcome {
  entityId: string;
  action: PlanAction;
  previousValue?: Record<string, unknown>; // only for updates — the prior values of the fields we're about to overwrite
}

/** Executes one plan item against the real repositories, resolving its supplier via the shared cache so the same "Supplier" column value across many rows only ever creates one Supplier record. */
export async function commitPlanItem(item: PlanItem, supplierCache: SupplierCache): Promise<CommitOutcome> {
  if (item.entityType === "transport") {
    const supplier = await supplierCache.resolve(item.supplierName);
    if (item.action === "update" && item.entityId) {
      const existing = await transportRepository.get(item.entityId);
      const previousValue = existing ? snapshotFields(existing, item.changedFields) : undefined;
      const updated = await transportRepository.update(item.entityId, item.changedFields as unknown as Partial<TransportItem>);
      return { entityId: updated.id, action: "update", previousValue };
    }
    const created = await transportRepository.create({
      vehicleType: "", capacity: 0, supplierId: supplier.id, pickup: "", drop: "", cost: 0, selling: 0, status: "Active",
      ...(item.changedFields as unknown as Partial<TransportItem>),
    } as unknown as Omit<TransportItem, "id" | "createdAt" | "updatedAt">);
    return { entityId: created.id, action: "create" };
  }

  if (item.entityType === "hotel") {
    const supplier = await supplierCache.resolve(item.supplierName);
    if (item.action === "update" && item.entityId) {
      const existing = await hotelRepository.get(item.entityId);
      const previousValue = existing ? snapshotFields(existing, item.changedFields) : undefined;
      const updated = await hotelRepository.update(item.entityId, item.changedFields as unknown as Partial<Hotel>);
      return { entityId: updated.id, action: "update", previousValue };
    }
    const created = await hotelRepository.create({
      name: "", city: "", starRating: 0, roomTypes: [], mealPlans: [], supplierId: supplier.id,
      supplierCost: 0, sellingCost: 0, images: [], status: "Active",
      ...(item.changedFields as unknown as Partial<Hotel>),
    } as unknown as Omit<Hotel, "id" | "createdAt" | "updatedAt">);
    return { entityId: created.id, action: "create" };
  }

  if (item.entityType === "activity") {
    const supplier = await supplierCache.resolve(item.supplierName);
    if (item.action === "update" && item.entityId) {
      const existing = await activityRepository.get(item.entityId);
      const previousValue = existing ? snapshotFields(existing, item.changedFields) : undefined;
      const updated = await activityRepository.update(item.entityId, item.changedFields as unknown as Partial<ActivityItem>);
      return { entityId: updated.id, action: "update", previousValue };
    }
    const created = await activityRepository.create({
      name: "", city: "", supplierId: supplier.id, duration: "", operatingDays: [], cost: 0, selling: 0, status: "Active",
      ...(item.changedFields as unknown as Partial<ActivityItem>),
    } as unknown as Omit<ActivityItem, "id" | "createdAt" | "updatedAt">);
    return { entityId: created.id, action: "create" };
  }

  // addon
  if (item.action === "update" && item.entityId) {
    const existing = await addOnRepository.get(item.entityId);
    const previousValue = existing ? snapshotFields(existing, item.changedFields) : undefined;
    const updated = await addOnRepository.update(item.entityId, item.changedFields as unknown as Partial<AddOnItem>);
    return { entityId: updated.id, action: "update", previousValue };
  }
  const created = await addOnRepository.create({
    name: "", price: 0, status: "Active",
    ...(item.changedFields as unknown as Partial<AddOnItem>),
  } as unknown as Omit<AddOnItem, "id" | "createdAt" | "updatedAt">);
  return { entityId: created.id, action: "create" };
}

function snapshotFields(existing: object, changed: Record<string, unknown>): Record<string, unknown> {
  const source = existing as Record<string, unknown>;
  const snapshot: Record<string, unknown> = {};
  for (const key of Object.keys(changed)) {
    if (key in source) snapshot[key] = source[key];
  }
  return snapshot;
}

export function tallyPlan(items: PlanItem[]): { created: ImportEntityCounts; updated: ImportEntityCounts } {
  const created = zeroCounts();
  const updated = zeroCounts();
  for (const item of items) {
    const bucket = item.action === "create" ? created : updated;
    bucket[item.entityType] += 1;
  }
  return { created, updated };
}
