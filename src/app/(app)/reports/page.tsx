import { statsRepository } from "@/lib/repositories";
import { SalesPerformanceChart } from "@/components/dashboard/sales-performance-chart";
import { Download } from "lucide-react";

export default async function ReportsPage() {
  const stats = await statsRepository.getDashboardStats();

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            Monthly revenue, profit, and destination performance.
          </p>
        </div>
        <div className="flex gap-2">
          {["CSV", "Excel"].map((fmt) => (
            <button
              key={fmt}
              disabled
              title="Export wiring is a Phase 2 item"
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl opacity-50 cursor-not-allowed"
              style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
            >
              <Download size={14} /> Export {fmt}
            </button>
          ))}
        </div>
      </div>

      <div className="card-surface p-5">
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--color-text-secondary)" }}>Sales Performance</h2>
        <SalesPerformanceChart data={stats.salesPerformance} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card-surface p-5">
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--color-text-secondary)" }}>Destination Performance</h2>
          <div className="space-y-2">
            {stats.topDestinations.map((d) => (
              <div key={d.name} className="flex justify-between text-sm">
                <span>{d.name}</span>
                <span style={{ color: "var(--color-text-muted)" }}>{d.count} queries</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card-surface p-5">
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--color-text-secondary)" }}>Hotel Usage</h2>
          <div className="space-y-2">
            {stats.popularHotels.map((h) => (
              <div key={h.name} className="flex justify-between text-sm">
                <span>{h.name}</span>
                <span style={{ color: "var(--color-text-muted)" }}>{h.count} bookings</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
