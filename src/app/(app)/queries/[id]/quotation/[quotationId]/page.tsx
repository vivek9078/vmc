import { notFound } from "next/navigation";
import {
  quotationRepository, queryRepository, hotelRepository, transportRepository, activityRepository,
} from "@/lib/repositories";
import { calculatePricing } from "@/lib/pricing";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { stripHotelCost, stripTransportCost, stripActivityCost, stripQuotationCost, stripPricingProfit } from "@/lib/fieldSecurity";

import { QuotationBuilder } from "./quotation-builder";

export default async function QuotationBuilderPage({
  params,
}: {
  params: Promise<{ id: string; quotationId: string }>;
}) {
  const { id, quotationId } = await params;

  const [quotation, query, hotels, transportItems, activities, { permissions }] = await Promise.all([
    quotationRepository.get(quotationId),
    queryRepository.get(id),
    hotelRepository.list(),
    transportRepository.list(),
    activityRepository.list(),
    requireAuth(),
  ]);

  if (!quotation || !query) notFound();

  const pricing = calculatePricing(quotation);
  // Sales has quotation.create so they can build a quotation at all, but
  // that must NOT also grant profit/margin visibility — those require the
  // dedicated view_pricing permission on their own.
  const canSeePricing = hasPermission(permissions, "quotation.view_pricing");
  const canSeeCost = hasPermission(permissions, "quotation.view_supplier_cost");
  const canManageBookings = hasPermission(permissions, "booking.manage");

  // Strip cost/profit fields server-side rather than shipping them to the
  // client and hiding them behind canSeeCost/canSeePricing in React — see
  // src/lib/fieldSecurity.ts.
  return (
    <QuotationBuilder
      initialQuotation={canSeeCost ? quotation : stripQuotationCost(quotation)}
      initialPricing={canSeePricing ? pricing : stripPricingProfit(pricing)}
      query={query}
      hotels={canSeeCost ? hotels : stripHotelCost(hotels)}
      transportItems={canSeeCost ? transportItems : stripTransportCost(transportItems)}
      activities={canSeeCost ? activities : stripActivityCost(activities)}
      canSeeCost={canSeeCost}
      canSeePricing={canSeePricing}
      canManageBookings={canManageBookings}
    />
  );
}
