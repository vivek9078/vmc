"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { rateSheetRepository } from "@/lib/repositories";
import { parseRateSheetCSVFiles } from "@/lib/rateSheetImport";
import { applySyncCandidate, findInventorySyncCandidates, type SyncCandidate } from "@/lib/rateSheetSync";
import type { RateSheetCategory, RateSheetItem } from "@/types/domain";

const seasonSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  prices: z.record(z.string(), z.number().min(0)),
});

const rateItemSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  name: z.string().min(1, "Name is required").max(160),
  service: z.string().min(1, "Service is required").max(80),
  description: z.string().max(1000).optional(),
  openTime: z.string().max(20).optional(),
  closeTime: z.string().max(20).optional(),
  durationMinutes: z.number().min(0).optional(),
  slots: z.string().max(40).optional(),
  distance: z.string().max(60).optional(),
  startTime: z.string().max(20).optional(),
  daySchedule: z.string().max(1000).optional(),
  seasons: z.array(seasonSchema).min(1, "At least one season is required"),
});

export type RateItemInput = z.infer<typeof rateItemSchema>;

const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  destination: z.string().min(1, "Destination is required").max(60),
  serviceMode: z.enum(["SIC", "PVT", "Group", "Other"]),
  priceColumns: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) })).min(1, "At least one price column is required"),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export async function listCategoriesAction(): Promise<RateSheetCategory[]> {
  await requireAuth("inventory.manage_rates");
  return rateSheetRepository.listCategories();
}

export async function listRateItemsAction(categoryId: string): Promise<RateSheetItem[]> {
  await requireAuth("inventory.manage_rates");
  return rateSheetRepository.list(categoryId);
}

export async function createCategoryAction(input: CategoryInput) {
  await requireAuth("inventory.manage_rates");
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const category = await rateSheetRepository.createCategory(parsed.data);
  return { ok: true as const, category };
}

export async function createRateItemAction(input: RateItemInput) {
  await requireAuth("inventory.manage_rates");
  const parsed = rateItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const item = await rateSheetRepository.create({ ...parsed.data, status: "Active" });
  return { ok: true as const, item };
}

const syncCandidateSchema = z.object({
  entityType: z.enum(["hotel", "transport", "activity"]),
  entityId: z.string().min(1),
  rateItemId: z.string().min(1),
  priceColumnId: z.string().min(1),
  newPrice: z.number().min(0),
});

/** Confirms one or more "suggested" matches from the post-import review panel: applies the new price and links the record so future imports auto-apply without review. */
export async function applyInventorySyncAction(candidates: SyncCandidate[]): Promise<{ ok: boolean; applied: number; error?: string }> {
  await requireAuth("inventory.manage_rates");
  const parsed = z.array(syncCandidateSchema).safeParse(candidates);
  if (!parsed.success) {
    return { ok: false, applied: 0, error: "That selection looked malformed — please re-run the import and try again." };
  }
  for (const c of parsed.data) {
    await applySyncCandidate(c);
  }
  return { ok: true, applied: parsed.data.length };
}

export interface ImportSummary {
  ok: boolean;
  categoriesFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  warnings: string[];
  error?: string;
  /** Hotels/Transport/Activities that were already linked to a rate item — updated automatically. */
  inventoryAutoUpdated: number;
  /** Name-matched but unlinked — needs a human to confirm before anything changes. */
  suggestedMatches: SyncCandidate[];
}

const MAX_IMPORT_BYTES = 10 * 1024 * 1024; // 10MB per file

export async function importRateSheetCsvAction(formData: FormData): Promise<ImportSummary> {
  await requireAuth("inventory.manage_rates");

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return { ok: false, categoriesFound: 0, itemsCreated: 0, itemsUpdated: 0, warnings: [], inventoryAutoUpdated: 0, suggestedMatches: [], error: "No file was uploaded." };
  }
  for (const file of files) {
    if (!/\.csv$/i.test(file.name)) {
      return { ok: false, categoriesFound: 0, itemsCreated: 0, itemsUpdated: 0, warnings: [], inventoryAutoUpdated: 0, suggestedMatches: [], error: `"${file.name}" is not a .csv file.` };
    }
    if (file.size > MAX_IMPORT_BYTES) {
      return { ok: false, categoriesFound: 0, itemsCreated: 0, itemsUpdated: 0, warnings: [], inventoryAutoUpdated: 0, suggestedMatches: [], error: `"${file.name}" is too large (max 10MB).` };
    }
  }

  let parsed: ReturnType<typeof parseRateSheetCSVFiles>;
  try {
    const textFiles = await Promise.all(files.map(async (file) => ({ name: file.name, text: await file.text() })));
    parsed = parseRateSheetCSVFiles(textFiles);
  } catch {
    return { ok: false, categoriesFound: 0, itemsCreated: 0, itemsUpdated: 0, warnings: [], inventoryAutoUpdated: 0, suggestedMatches: [], error: "Could not read those files — are they valid CSV files?" };
  }

  if (parsed.categories.length === 0) {
    return { ok: false, categoriesFound: 0, itemsCreated: 0, itemsUpdated: 0, warnings: parsed.warnings, inventoryAutoUpdated: 0, suggestedMatches: [], error: "No rate-sheet-shaped data was found in those files." };
  }

  const categoryIdByName = new Map<string, string>();
  for (const cat of parsed.categories) {
    const saved = await rateSheetRepository.upsertCategoryByName(cat);
    categoryIdByName.set(cat.name.trim().toLowerCase(), saved.id);
  }

  let created = 0;
  let updated = 0;
  const warnings = [...parsed.warnings];
  const touchedItemIds: string[] = [];

  for (const { categoryName, ...rest } of parsed.items) {
    const categoryId = categoryIdByName.get(categoryName.trim().toLowerCase());
    if (!categoryId) {
      warnings.push(`Skipped "${rest.name}" — could not resolve its category "${categoryName}".`);
      continue;
    }
    const { item, created: wasCreated } = await rateSheetRepository.upsertByName({ ...rest, categoryId, status: "Active" });
    touchedItemIds.push(item.id);
    if (wasCreated) created += 1;
    else updated += 1;
  }

  // Push new prices out to Hotels/Transport/Activities: anything already
  // linked to one of the items we just touched updates automatically;
  // anything that merely looks like a name match is surfaced for review
  // instead of being changed silently.
  let inventoryAutoUpdated = 0;
  let suggestedMatches: SyncCandidate[] = [];
  try {
    const candidates = await findInventorySyncCandidates(touchedItemIds);
    const linked = candidates.filter((c) => c.matchType === "linked");
    suggestedMatches = candidates.filter((c) => c.matchType === "suggested");
    for (const c of linked) {
      await applySyncCandidate(c);
      inventoryAutoUpdated += 1;
    }
  } catch {
    warnings.push("Rate items were imported, but syncing prices to inventory failed — check Hotels/Transport/Activities manually.");
  }

  return {
    ok: true,
    categoriesFound: parsed.categories.length,
    itemsCreated: created,
    itemsUpdated: updated,
    warnings,
    inventoryAutoUpdated,
    suggestedMatches,
  };
}
