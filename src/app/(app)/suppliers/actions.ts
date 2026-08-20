"use server";

import { requireAuth } from "@/lib/auth";
import { supplierRepository } from "@/lib/repositories";
import { z } from "zod";

const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required").max(150),
  company: z.string().min(1, "Company is required").max(150),
  phone: z.string().min(1, "Phone is required").max(30),
  email: z.string().email("Invalid email").max(150),
  country: z.string().min(1, "Country is required").max(80),
  paymentTerms: z.string().max(80).optional(),
  gst: z.string().max(40).optional(),
  bankDetails: z.string().max(500).optional(),
  internalNotes: z.string().max(1000).optional(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;

export async function createSupplierAction(input: SupplierInput) {
  // Matches the page-level gate: managing suppliers requires inventory.manage_suppliers.
  await requireAuth("inventory.manage_suppliers");

  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const record = await supplierRepository.create(parsed.data);
  return { ok: true as const, supplier: record };
}
