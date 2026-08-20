"use server";

import { requireAuth } from "@/lib/auth";
import { transportRepository } from "@/lib/repositories";
import { z } from "zod";

const transportSchema = z.object({
  vehicleType: z.string().min(1, "Vehicle type is required").max(80),
  capacity: z.number().int().min(1),
  supplierId: z.string().min(1, "Supplier is required"),
  pickup: z.string().min(1, "Pickup location is required").max(120),
  drop: z.string().min(1, "Drop location is required").max(120),
  cost: z.number().min(0),
  selling: z.number().min(0),
  remarks: z.string().max(500).optional(),
  availableFrom: z.string().max(10).optional(),
  availableTo: z.string().max(10).optional(),
}).refine(
  (data) => !data.availableFrom || !data.availableTo || data.availableTo >= data.availableFrom,
  { message: "Available To must be on or after Available From.", path: ["availableTo"] }
);

export type TransportInput = z.infer<typeof transportSchema>;

export async function listTransportAction(filters?: { search?: string }) {
  await requireAuth();
  return transportRepository.list(filters);
}

export async function createTransportAction(input: TransportInput) {
  await requireAuth("inventory.manage_transport");

  const parsed = transportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const record = await transportRepository.create({ ...parsed.data, status: "Active" });
  return { ok: true as const, item: record };
}
