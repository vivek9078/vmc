import type {
  Hotel, TransportItem, ActivityItem, Quotation, PricingBreakdown,
} from "@/types/domain";

/**
 * Removes supplier-cost fields from inventory records before they're sent to
 * the client. Call this instead of passing `hotelRepository.list()` etc.
 * straight through to a Client Component whenever the caller lacks
 * `quotation.view_supplier_cost` — the React props for a Server Component
 * are serialized into the page payload regardless of what the UI chooses to
 * render, so a boolean "canSeeCost" flag alone does not stop the number
 * from reaching the browser; the field itself has to be gone before it's
 * ever put on the wire.
 */
export function stripHotelCost(hotels: Hotel[]): Hotel[] {
  return hotels.map((h) => ({ ...h, supplierCost: 0 }));
}

export function stripTransportCost(items: TransportItem[]): TransportItem[] {
  return items.map((i) => ({ ...i, cost: 0 }));
}

export function stripActivityCost(items: ActivityItem[]): ActivityItem[] {
  return items.map((i) => ({ ...i, cost: 0 }));
}

/**
 * Zeroes out per-line supplier cost on a quotation's hotel/transport/activity
 * lines, and drops staff-only internal comments. Selling prices (what Sales
 * is allowed to see) are left untouched.
 */
export function stripQuotationCost(quotation: Quotation): Quotation {
  return {
    ...quotation,
    hotelLines: quotation.hotelLines.map((l) => ({ ...l, costPrice: 0 })),
    transportLines: quotation.transportLines.map((l) => ({ ...l, costPrice: 0 })),
    activityLines: quotation.activityLines.map((l) => ({ ...l, costPrice: 0 })),
    internalComments: undefined,
  };
}

/**
 * Zeroes out the cost/profit/margin fields of a pricing breakdown. What
 * remains (hotelTotal, transportTotal, activitiesTotal, sellingSubtotal,
 * markup/discount/GST, finalSellingPrice) is all "selling price" data,
 * which Sales is meant to see per the RBAC spec.
 */
export function stripPricingProfit(pricing: PricingBreakdown): PricingBreakdown {
  return { ...pricing, costTotal: 0, profit: 0, margin: 0 };
}
