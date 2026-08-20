import { formatCurrency } from "@/lib/currency";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { statsRepository } from "@/lib/repositories";
import { redirect } from "next/navigation";

export default async function ProfitPage() {
  const { permissions } = await requireAuth();
  if (!hasPermission(permissions, "quotation.view_pricing")) {
    redirect("/dashboard");
  }

  const stats = await statsRepository.getDashboardStats();
  const margin = ((stats.monthlyProfit / stats.monthlyRevenue) * 100).toFixed(1);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Profit</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          Visible to Admin and Finance roles only.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card-surface p-5">
          <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>Monthly Revenue</div>
          <div className="text-xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
        </div>
        <div className="card-surface p-5">
          <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>Monthly Profit</div>
          <div className="text-xl font-bold" style={{ color: "var(--color-emerald-600)" }}>{formatCurrency(stats.monthlyProfit)}</div>
        </div>
        <div className="card-surface p-5">
          <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>Margin</div>
          <div className="text-xl font-bold">{margin}%</div>
        </div>
      </div>
    </div>
  );
}
