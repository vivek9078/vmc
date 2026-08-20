"use server";

import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { stripQuotationCost, stripPricingProfit } from "@/lib/fieldSecurity";
import { quotationRepository, hotelRepository, transportRepository, activityRepository, queryRepository, bookingRepository } from "@/lib/repositories";
import { calculatePricing } from "@/lib/pricing";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { QuotationDocStatus } from "@/types/domain";

function randomLineId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

export async function createQuotationAction(queryId: string, packageName: string) {
  await requireAuth("quotation.create");
  const quotation = await quotationRepository.create(queryId, packageName);
  revalidatePath(`/queries/${queryId}`);
  return quotation;
}

export async function getQuotationWithPricing(quotationId: string) {
  const { permissions } = await requireAuth("query.view");
  const quotation = await quotationRepository.get(quotationId);
  if (!quotation) return null;
  const pricing = calculatePricing(quotation);
  if (hasPermission(permissions, "quotation.view_supplier_cost") && hasPermission(permissions, "quotation.view_pricing")) {
    return { quotation, pricing };
  }
  return {
    quotation: hasPermission(permissions, "quotation.view_supplier_cost") ? quotation : stripQuotationCost(quotation),
    pricing: hasPermission(permissions, "quotation.view_pricing") ? pricing : stripPricingProfit(pricing),
  };
}

export async function addHotelLineAction(quotationId: string, hotelId: string, nights: number, rooms: number) {
  await requireAuth("quotation.create");
  const quotation = await quotationRepository.get(quotationId);
  const hotel = await hotelRepository.get(hotelId);
  if (!quotation || !hotel) throw new Error("Quotation or hotel not found");

  // Cost/selling prices are recomputed server-side from the inventory record —
  // never accepted from the client — so a tampered request can't smuggle a
  // different price through.
  const line = {
    id: randomLineId("hl"),
    hotelId: hotel.id,
    hotelName: hotel.name,
    city: hotel.city,
    nights,
    rooms,
    costPrice: hotel.supplierCost * nights * rooms,
    sellingPrice: hotel.sellingCost * nights * rooms,
  };

  const updated = await quotationRepository.update(quotationId, {
    hotelLines: [...quotation.hotelLines, line],
  });
  revalidatePath(`/queries/${updated.queryId}/quotation/${quotationId}`);
  return { quotation: updated, pricing: calculatePricing(updated) };
}

export async function removeHotelLineAction(quotationId: string, lineId: string) {
  await requireAuth("quotation.create");
  const quotation = await quotationRepository.get(quotationId);
  if (!quotation) throw new Error("Quotation not found");
  const updated = await quotationRepository.update(quotationId, {
    hotelLines: quotation.hotelLines.filter((l) => l.id !== lineId),
  });
  revalidatePath(`/queries/${updated.queryId}/quotation/${quotationId}`);
  return { quotation: updated, pricing: calculatePricing(updated) };
}

export async function addTransportLineAction(quotationId: string, transportId: string, day: number) {
  const quotation = await quotationRepository.get(quotationId);
  const item = await transportRepository.list().then((all) => all.find((t) => t.id === transportId));
  await requireAuth("quotation.create");
  if (!quotation || !item) throw new Error("Quotation or transport item not found");

  const line = {
    id: randomLineId("tl"),
    transportId: item.id,
    vehicleType: item.vehicleType,
    day,
    costPrice: item.cost,
    sellingPrice: item.selling,
  };

  const updated = await quotationRepository.update(quotationId, {
    transportLines: [...quotation.transportLines, line],
  });
  revalidatePath(`/queries/${updated.queryId}/quotation/${quotationId}`);
  return { quotation: updated, pricing: calculatePricing(updated) };
}

export async function removeTransportLineAction(quotationId: string, lineId: string) {
  await requireAuth("quotation.create");
  const quotation = await quotationRepository.get(quotationId);
  if (!quotation) throw new Error("Quotation not found");
  const updated = await quotationRepository.update(quotationId, {
    transportLines: quotation.transportLines.filter((l) => l.id !== lineId),
  });
  revalidatePath(`/queries/${updated.queryId}/quotation/${quotationId}`);
  return { quotation: updated, pricing: calculatePricing(updated) };
}

export async function addActivityLineAction(quotationId: string, activityId: string, day: number, pax: number) {
  const quotation = await quotationRepository.get(quotationId);
  const item = await activityRepository.list().then((all) => all.find((a) => a.id === activityId));
  await requireAuth("quotation.create");
  if (!quotation || !item) throw new Error("Quotation or activity not found");

  const line = {
    id: randomLineId("al"),
    activityId: item.id,
    activityName: item.name,
    day,
    pax,
    costPrice: item.cost * pax,
    sellingPrice: item.selling * pax,
  };

  const updated = await quotationRepository.update(quotationId, {
    activityLines: [...quotation.activityLines, line],
  });
  revalidatePath(`/queries/${updated.queryId}/quotation/${quotationId}`);
  return { quotation: updated, pricing: calculatePricing(updated) };
}

export async function removeActivityLineAction(quotationId: string, lineId: string) {
  await requireAuth("quotation.create");
  const quotation = await quotationRepository.get(quotationId);
  if (!quotation) throw new Error("Quotation not found");
  const updated = await quotationRepository.update(quotationId, {
    activityLines: quotation.activityLines.filter((l) => l.id !== lineId),
  });
  revalidatePath(`/queries/${updated.queryId}/quotation/${quotationId}`);
  return { quotation: updated, pricing: calculatePricing(updated) };
}

export async function updatePricingInputsAction(
  quotationId: string,
  data: { markupPercent?: number; discountPercent?: number; gstPercent?: number }
) {
  await requireAuth("quotation.create");
  const updated = await quotationRepository.update(quotationId, data);
  revalidatePath(`/queries/${updated.queryId}/quotation/${quotationId}`);
  return { quotation: updated, pricing: calculatePricing(updated) };
}

export async function updateInternalCommentsAction(quotationId: string, internalComments: string) {
  await requireAuth("quotation.create");
  await quotationRepository.update(quotationId, { internalComments });
}

export async function updateQuotationStatusAction(quotationId: string, status: QuotationDocStatus) {
  await requireAuth("quotation.send");
  const updated = await quotationRepository.update(quotationId, { status });
  revalidatePath(`/queries/${updated.queryId}/quotation/${quotationId}`);
  return updated;
}

/**
 * The single place a Quotation becomes a real Booking. Creates a Booking
 * with a frozen snapshot of the quotation's pricing (so later rate-sheet
 * changes never retroactively alter an already-confirmed booking's
 * financials), marks the quotation Accepted and the query Confirmed.
 * Every dashboard revenue/profit figure ultimately traces back to this
 * moment — nothing else creates a Booking.
 */
export async function confirmBookingAction(quotationId: string) {
  const ctx = await requireAuth("booking.manage");

  const quotation = await quotationRepository.get(quotationId);
  if (!quotation) throw new Error("Quotation not found");

  const query = await queryRepository.get(quotation.queryId);
  if (!query) throw new Error("Query not found");

  const existing = await bookingRepository.listByQuery(query.id);
  const alreadyConfirmed = existing.find((b) => b.quotationId === quotationId && b.status !== "Cancelled");
  if (alreadyConfirmed) {
    return { ok: false as const, error: `This quotation is already confirmed as booking ${alreadyConfirmed.id}.` };
  }

  const pricing = calculatePricing(quotation);

  const booking = await bookingRepository.create({
    queryId: query.id,
    quotationId: quotation.id,
    guestName: query.guestName || query.contactPerson || "Guest",
    destination: query.destination,
    travelDate: query.travelDate,
    numberOfNights: query.numberOfNights,
    packageName: quotation.packageName,
    salesTeamUserId: query.salesTeamUserId,
    costTotal: pricing.costTotal,
    sellingTotal: pricing.finalSellingPrice,
    profit: pricing.profit,
    status: "Confirmed",
    confirmedByUserId: ctx.userId,
  });

  const updatedQuotation = await quotationRepository.update(quotationId, { status: "Accepted" });
  await queryRepository.update(query.id, { status: "Confirmed" });

  await logAudit({
    userId: ctx.userId,
    userEmail: ctx.email,
    action: "create",
    entityType: "Booking",
    entityId: booking.id,
    details: `${query.guestName || query.contactPerson} — ${query.destination}`,
  });

  revalidatePath(`/queries/${query.id}/quotation/${quotationId}`);
  revalidatePath("/bookings");
  revalidatePath("/dashboard");

  return { ok: true as const, booking, quotation: updatedQuotation };
}
