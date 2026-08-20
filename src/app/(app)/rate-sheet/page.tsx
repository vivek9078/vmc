import Link from "next/link";
import { rateSheetRepository } from "@/lib/repositories";
import { requireAuth } from "@/lib/auth";
import { RateTable } from "./rate-table";
import { AddRateItemForm } from "./add-rate-item-form";
import { ImportRateSheetForm } from "./import-excel-form";

export default async function RateSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  // requireAuth(permission) throws AuthorizationError (caught by (app)/error.tsx)
  // when the caller lacks this permission — so viewing the Rate Sheet at all,
  // not just editing it, requires inventory.manage_rates. Previously only the
  // edit controls were gated here while the full item list (supplier cost
  // included) was fetched and rendered for any authenticated user.
  await requireAuth("inventory.manage_rates");
  const canManage = true;

  const categories = await rateSheetRepository.listCategories();
  const activeCategory = categories.find((c) => c.id === params.category) ?? categories[0] ?? null;
  const items = activeCategory ? await rateSheetRepository.list(activeCategory.id) : [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Rate Sheet</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {categories.length} {categories.length === 1 ? "tab" : "tabs"} · {items.length} rates in{" "}
            {activeCategory ? activeCategory.name : "this tab"}
          </p>
        </div>
        {canManage && <ImportRateSheetForm />}
      </div>

      {categories.length === 0 ? (
        <div className="card-surface p-8 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
          No rate sheet tabs yet. {canManage ? "Import a CSV file to get started." : ""}
        </div>
      ) : (
        <>
          {/* Tabs — mirrors the sheet-tab bar at the bottom of the source workbook */}
          <div className="flex gap-1 flex-wrap border-b" style={{ borderColor: "var(--color-border)" }}>
            {categories.map((c) => {
              const active = activeCategory?.id === c.id;
              return (
                <Link
                  key={c.id}
                  href={`/rate-sheet?category=${c.id}`}
                  className="text-xs font-medium px-3.5 py-2 rounded-t-lg -mb-px border"
                  style={
                    active
                      ? { background: "var(--color-card)", borderColor: "var(--color-border)", borderBottomColor: "var(--color-card)", color: "var(--color-teal-700)", fontWeight: 700 }
                      : { borderColor: "transparent", color: "var(--color-text-secondary)" }
                  }
                >
                  {c.name}
                </Link>
              );
            })}
          </div>

          {activeCategory && canManage && <AddRateItemForm category={activeCategory} />}

          {activeCategory && <RateTable category={activeCategory} items={items} />}
        </>
      )}
    </div>
  );
}
