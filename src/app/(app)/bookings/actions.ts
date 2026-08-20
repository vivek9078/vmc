"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { bookingRepository, paymentRepository } from "@/lib/repositories";
import { logAudit } from "@/lib/audit";
import type { BookingStatus } from "@/types/domain";

const paymentSchema = z.object({
  direction: z.enum(["Received", "Paid"]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: z.enum(["Bank Transfer", "Card", "Cash", "UPI", "Other"]),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  paidAt: z.string().min(1, "Date is required"),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

export async function recordPaymentAction(bookingId: string, input: PaymentInput) {
  const ctx = await requireAuth("accounts.manage");

  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const booking = await bookingRepository.get(bookingId);
  if (!booking) return { ok: false as const, error: "Booking not found." };

  const payment = await paymentRepository.create({ ...parsed.data, bookingId, recordedByUserId: ctx.userId });

  await logAudit({
    userId: ctx.userId,
    userEmail: ctx.email,
    action: "create",
    entityType: "Payment",
    entityId: payment.id,
    details: `${parsed.data.direction} ${parsed.data.amount} on ${booking.id}`,
  });

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");

  return { ok: true as const, payment };
}

export async function updateBookingStatusAction(bookingId: string, status: BookingStatus) {
  const ctx = await requireAuth("booking.manage");

  const booking = await bookingRepository.update(bookingId, { status });

  await logAudit({
    userId: ctx.userId,
    userEmail: ctx.email,
    action: "update",
    entityType: "Booking",
    entityId: booking.id,
    details: `status -> ${status}`,
  });

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
  revalidatePath("/dashboard");

  return { ok: true as const, booking };
}
