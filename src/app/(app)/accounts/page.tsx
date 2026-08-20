import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { bookingRepository, paymentRepository } from "@/lib/repositories";
import { formatCurrency } from "@/lib/currency";
import { RecordPaymentPanel } from "./record-payment-panel";

export default async function AccountsPage() {
  const { permissions } = await requireAuth();
  if (!hasPermission(permissions, "accounts.view")) redirect("/dashboard");

  const canManage = hasPermission(permissions, "accounts.manage");

  const [payments, bookings] = await Promise.all([paymentRepository.list(), bookingRepository.list()]);
  const bookingById = new Map(bookings.map((b) => [b.id, b]));

  const totalReceived = payments.filter((p) => p.direction === "Received").reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments.filter((p) => p.direction === "Paid").reduce((s, p) => s + p.amount, 0);
  const net = totalReceived - totalPaid;

  const confirmedBookings = bookings.filter((b) => b.status !== "Cancelled");

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Accounts</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          {payments.length === 0 ? "No payments recorded yet." : `${payments.length} payments across ${bookings.length} bookings`}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card-surface p-5">
          <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>Total Received</div>
          <div className="text-xl font-bold" style={{ color: "var(--color-emerald-600)" }}>{formatCurrency(totalReceived)}</div>
        </div>
        <div className="card-surface p-5">
          <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>Total Paid to Suppliers</div>
          <div className="text-xl font-bold">{formatCurrency(totalPaid)}</div>
        </div>
        <div className="card-surface p-5">
          <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>Net</div>
          <div className="text-xl font-bold">{formatCurrency(net)}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card-surface overflow-x-auto">
          {payments.length === 0 ? (
            <p className="text-sm p-5" style={{ color: "var(--color-text-muted)" }}>Nothing recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Booking</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Direction</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Method</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const booking = bookingById.get(p.bookingId);
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td className="px-4 py-2.5" style={{ color: "var(--color-text-secondary)" }}>{new Date(p.paidAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/bookings/${p.bookingId}`} className="font-medium" style={{ color: "var(--color-teal-700)" }}>
                          {p.bookingId}
                        </Link>
                        {booking && <span style={{ color: "var(--color-text-muted)" }}> · {booking.guestName}</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[11px] px-1.5 py-0.5 rounded" style={p.direction === "Received"
                          ? { background: "var(--color-emerald-100)", color: "var(--color-emerald-600)" }
                          : { background: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                          {p.direction}
                        </span>
                      </td>
                      <td className="px-4 py-2.5" style={{ color: "var(--color-text-secondary)" }}>{p.method}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(p.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {canManage && <RecordPaymentPanel bookings={confirmedBookings} />}
      </div>
    </div>
  );
}
