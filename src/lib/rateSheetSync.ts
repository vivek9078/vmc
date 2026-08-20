import type { ActivityItem, Hotel, RateSheetItem, TransportItem } from "@/types/domain";
import { activityRepository, hotelRepository, rateSheetRepository, transportRepository } from "@/lib/repositories";

export type InventoryEntityType = "hotel" | "transport" | "activity";

export interface SyncCandidate {
  entityType: InventoryEntityType;
  entityId: string;
  entityName: string;
  rateItemId: string;
  rateItemName: string;
  priceColumnId: string;
  priceColumnLabel: string;
  oldPrice: number;
  newPrice: number;
  /** "linked" = this inventory record already points at this rate item — safe to auto-apply.
   *  "suggested" = name looked similar enough to flag, but nothing is linked yet — needs a human to confirm. */
  matchType: "linked" | "suggested";
}

/** Picks the price for whichever season on the item covers today, falling back to the first season that has this column. */
function currentPrice(item: RateSheetItem, columnId: string): number | undefined {
  const today = new Date().toISOString().slice(0, 10);
  const inRange = item.seasons.find(
    (s) => s.startDate && s.endDate && s.startDate <= today && today <= s.endDate && s.prices[columnId] !== undefined
  );
  const fallback = item.seasons.find((s) => s.prices[columnId] !== undefined);
  return (inRange ?? fallback)?.prices[columnId];
}

/** Cheap, dependency-free name-similarity check: normalize punctuation/case/whitespace and compare. */
function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function namesLikelyMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // one contains the other (handles "Hanoi City Tour" vs "Hanoi City Tour - Full Day")
  return na.length > 4 && nb.length > 4 && (na.includes(nb) || nb.includes(na));
}

/**
 * Compares every rate-sheet item that was just touched by an import against
 * current inventory. Returns two kinds of candidates:
 *  - "linked": the inventory record already has linkedRateItemId set to this
 *    item — these are safe to auto-apply immediately after import.
 *  - "suggested": no link exists yet, but the names look like the same
 *    service — these are surfaced for a human to confirm before anything
 *    changes, since a bad auto-match would silently corrupt a live price.
 */
export async function findInventorySyncCandidates(rateItemIds: string[]): Promise<SyncCandidate[]> {
  if (rateItemIds.length === 0) return [];

  const [hotels, transports, activities] = await Promise.all([
    hotelRepository.list(),
    transportRepository.list(),
    activityRepository.list(),
  ]);

  // Rate items are scoped by category; we don't know the category up front,
  // so pull every category and search within each until items are found.
  const categories = await rateSheetRepository.listCategories();
  const rateItemsById = new Map<string, RateSheetItem>();
  for (const cat of categories) {
    const items = await rateSheetRepository.list(cat.id);
    for (const it of items) {
      if (rateItemIds.includes(it.id)) rateItemsById.set(it.id, it);
    }
  }

  const candidates: SyncCandidate[] = [];

  const evaluate = (
    entityType: InventoryEntityType,
    entityId: string,
    entityName: string,
    linkedRateItemId: string | undefined,
    linkedRateColumnId: string | undefined,
    oldPrice: number
  ) => {
    for (const item of rateItemsById.values()) {
      const isLinked = linkedRateItemId === item.id;
      const columnId = isLinked ? linkedRateColumnId : item.seasons[0]?.prices && Object.keys(item.seasons[0].prices)[0];
      if (!columnId) continue;

      if (isLinked) {
        const newPrice = currentPrice(item, columnId);
        if (newPrice === undefined || newPrice === oldPrice) continue;
        candidates.push({
          entityType, entityId, entityName,
          rateItemId: item.id, rateItemName: item.name,
          priceColumnId: columnId, priceColumnLabel: columnId,
          oldPrice, newPrice, matchType: "linked",
        });
      } else if (namesLikelyMatch(entityName, item.name)) {
        const newPrice = currentPrice(item, columnId);
        if (newPrice === undefined) continue;
        candidates.push({
          entityType, entityId, entityName,
          rateItemId: item.id, rateItemName: item.name,
          priceColumnId: columnId, priceColumnLabel: columnId,
          oldPrice, newPrice, matchType: "suggested",
        });
      }
    }
  };

  for (const h of hotels) evaluate("hotel", h.id, h.name, h.linkedRateItemId, h.linkedRateColumnId, h.sellingCost);
  for (const t of transports) evaluate("transport", t.id, `${t.vehicleType} (${t.pickup} → ${t.drop})`, t.linkedRateItemId, t.linkedRateColumnId, t.selling);
  for (const a of activities) evaluate("activity", a.id, a.name, a.linkedRateItemId, a.linkedRateColumnId, a.selling);

  return candidates;
}

/** Applies one confirmed candidate: updates the inventory record's selling price and (re)establishes the link so future imports auto-apply without review. */
export async function applySyncCandidate(c: Pick<SyncCandidate, "entityType" | "entityId" | "rateItemId" | "priceColumnId" | "newPrice">) {
  const link = { linkedRateItemId: c.rateItemId, linkedRateColumnId: c.priceColumnId };
  if (c.entityType === "hotel") {
    await hotelRepository.update(c.entityId, { sellingCost: c.newPrice, ...link } satisfies Partial<Hotel>);
  } else if (c.entityType === "transport") {
    await transportRepository.update(c.entityId, { selling: c.newPrice, ...link } satisfies Partial<TransportItem>);
  } else {
    await activityRepository.update(c.entityId, { selling: c.newPrice, ...link } satisfies Partial<ActivityItem>);
  }
}
