"use server";

import { requireAuth } from "@/lib/auth";
import { hotelRepository } from "@/lib/repositories";
import { z } from "zod";

const hotelSchema = z.object({
  name: z.string().min(1, "Hotel name is required").max(150),
  city: z.string().min(1, "City is required").max(80),
  starRating: z.number().int().min(1).max(5),
  roomTypes: z.array(z.string()).default([]),
  mealPlans: z.array(z.string()).default([]),
  supplierId: z.string().min(1, "Supplier is required"),
  supplierContact: z.string().max(80).optional(),
  supplierCost: z.number().min(0),
  sellingCost: z.number().min(0),
  cancellationPolicy: z.string().max(500).optional(),
  checkInTime: z.string().max(10).optional(),
  checkOutTime: z.string().max(10).optional(),
  availableFrom: z.string().max(10).optional(),
  availableTo: z.string().max(10).optional(),
  internalNotes: z.string().max(1000).optional(),
}).refine(
  (data) => !data.availableFrom || !data.availableTo || data.availableTo >= data.availableFrom,
  { message: "Available To must be on or after Available From.", path: ["availableTo"] }
);

export type HotelInput = z.infer<typeof hotelSchema>;

export async function listHotelsAction(filters?: { city?: string; search?: string }) {
  await requireAuth();
  return hotelRepository.list(filters);
}

export async function checkHotelDuplicateAction(name: string, city: string) {
  await requireAuth();
  if (!name || !city) return [];
  return hotelRepository.findPossibleDuplicates(name, city);
}

export async function createHotelAction(input: HotelInput) {
  await requireAuth("inventory.manage_hotels");

  const parsed = hotelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const record = await hotelRepository.create({ ...parsed.data, images: [], status: "Active" });
  return { ok: true as const, hotel: record };
}
