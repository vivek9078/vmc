import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { bookingRepository, paymentRepository } from "@/lib/repositories";
import { BookingDetail } from "./booking-detail";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { permissions } = await requireAuth();
  if (!hasPermission(permissions, "booking.view")) redirect("/dashboard");

  const [booking, payments] = await Promise.all([
    bookingRepository.get(id),
    paymentRepository.listByBooking(id),
  ]);
  if (!booking) notFound();

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Link href="/bookings" className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
        <ArrowLeft size={13} /> Bookings
      </Link>
      <div>
        <h1 className="text-xl font-bold tracking-tight">{booking.id}</h1>
      </div>
      <BookingDetail
        booking={booking}
        payments={payments}
        canRecordPayments={hasPermission(permissions, "accounts.manage")}
        canManageBooking={hasPermission(permissions, "booking.manage")}
        canSeeProfit={hasPermission(permissions, "quotation.view_pricing")}
      />
    </div>
  );
}
