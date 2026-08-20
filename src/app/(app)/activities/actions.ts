"use server";

import { requireAuth } from "@/lib/auth";
import { activityRepository } from "@/lib/repositories";
import { z } from "zod";

const activitySchema = z.object({
  name: z.string().min(1, "Activity name is required").max(150),
  city: z.string().min(1, "City is required").max(80),
  supplierId: z.string().min(1, "Supplier is required"),
  duration: z.string().min(1, "Duration is required").max(60),
  operatingDays: z.array(z.string()).default([]),
  cost: z.number().min(0),
  selling: z.number().min(0),
  remarks: z.string().max(500).optional(),
  availableFrom: z.string().max(10).optional(),
  availableTo: z.string().max(10).optional(),
}).refine(
  (data) => !data.availableFrom || !data.availableTo || data.availableTo >= data.availableFrom,
  { message: "Available To must be on or after Available From.", path: ["availableTo"] }
);

export type ActivityInput = z.infer<typeof activitySchema>;

export async function listActivitiesAction(filters?: { city?: string; search?: string }) {
  await requireAuth();
  return activityRepository.list(filters);
}

export async function createActivityAction(input: ActivityInput) {
  await requireAuth("inventory.manage_activities");

  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const record = await activityRepository.create({ ...parsed.data, status: "Active" });
  return { ok: true as const, item: record };
}
