import type { PricingBreakdown, Quotation } from "@/types/domain";

/**
 * Computes the full pricing breakdown for a quotation from its line items.
 * This is the single source of truth for cost/markup/discount/GST/profit/
 * margin math — server actions call this rather than trusting any total the
 * client might submit, and the UI calls it read-only to render a preview.
 *
 * Order of operations (matches the spec's Pricing Page):
 *   sellingSubtotal = sum of line selling prices
 *   + markup (percent of sellingSubtotal)
 *   - discount (percent of the marked-up amount)
 *   + GST (percent of the discounted amount)
 *   = finalSellingPrice
 *   profit = finalSellingPrice - costTotal
 *   margin = profit / finalSellingPrice
 */
export function calculatePricing(
  quotation: Pick<Quotation, "hotelLines" | "transportLines" | "activityLines" | "markupPercent" | "discountPercent" | "gstPercent">
): PricingBreakdown {
  const hotelTotal = quotation.hotelLines.reduce((sum, l) => sum + l.sellingPrice, 0);
  const transportTotal = quotation.transportLines.reduce((sum, l) => sum + l.sellingPrice, 0);
  const activitiesTotal = quotation.activityLines.reduce((sum, l) => sum + l.sellingPrice, 0);

  const hotelCost = quotation.hotelLines.reduce((sum, l) => sum + l.costPrice, 0);
  const transportCost = quotation.transportLines.reduce((sum, l) => sum + l.costPrice, 0);
  const activitiesCost = quotation.activityLines.reduce((sum, l) => sum + l.costPrice, 0);
  const costTotal = hotelCost + transportCost + activitiesCost;

  const sellingSubtotal = hotelTotal + transportTotal + activitiesTotal;

  const markupPercent = quotation.markupPercent || 0;
  const markupAmount = round2(sellingSubtotal * (markupPercent / 100));

  const afterMarkup = sellingSubtotal + markupAmount;

  const discountPercent = quotation.discountPercent || 0;
  const discountAmount = round2(afterMarkup * (discountPercent / 100));

  const afterDiscount = afterMarkup - discountAmount;

  const gstPercent = quotation.gstPercent || 0;
  const gstAmount = round2(afterDiscount * (gstPercent / 100));

  const finalSellingPrice = round2(afterDiscount + gstAmount);
  const profit = round2(finalSellingPrice - costTotal);
  const margin = finalSellingPrice > 0 ? round2((profit / finalSellingPrice) * 100) : 0;

  return {
    hotelTotal, transportTotal, activitiesTotal, costTotal, sellingSubtotal,
    markupPercent, markupAmount, discountPercent, discountAmount, gstPercent, gstAmount,
    finalSellingPrice, profit, margin,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
