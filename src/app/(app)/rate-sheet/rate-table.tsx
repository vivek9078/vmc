import type { RateSheetCategory, RateSheetItem } from "@/types/domain";
import { formatCurrency } from "@/lib/currency";

const HEADER_GREEN = "#34a853";
const HEADER_GREEN_DARK = "#2c9247";
const CELL_BORDER = "#c9c9c9";

interface BaseField {
  key: "service" | "openTime" | "closeTime" | "durationMinutes" | "slots" | "distance" | "startTime" | "daySchedule";
  label: string;
}

const SIC_FIELDS: BaseField[] = [
  { key: "service", label: "Service" },
  { key: "openTime", label: "Open Time" },
  { key: "closeTime", label: "Close Time" },
  { key: "durationMinutes", label: "Duration(Min)" },
  { key: "slots", label: "Slots" },
];

const PVT_FIELDS: BaseField[] = [
  { key: "service", label: "Service" },
  { key: "distance", label: "Distance" },
  { key: "startTime", label: "Start Time" },
  { key: "durationMinutes", label: "Duration(mins)" },
  { key: "daySchedule", label: "Day Schedule" },
];

function fieldValue(item: RateSheetItem, key: BaseField["key"]): string {
  const v = item[key as keyof RateSheetItem];
  if (v === undefined || v === null || v === "") return "";
  return String(v);
}

/** Every distinct season (by label) across the category's items, in first-seen order. */
function collectSeasons(items: RateSheetItem[]): { label: string; startDate?: string; endDate?: string }[] {
  const seen = new Map<string, { label: string; startDate?: string; endDate?: string }>();
  for (const item of items) {
    for (const s of item.seasons) {
      if (!seen.has(s.label)) seen.set(s.label, { label: s.label, startDate: s.startDate, endDate: s.endDate });
    }
  }
  return Array.from(seen.values());
}

export function RateTable({ category, items }: { category: RateSheetCategory; items: RateSheetItem[] }) {
  const baseFields = category.serviceMode === "PVT" ? PVT_FIELDS : SIC_FIELDS;
  const seasons = collectSeasons(items);
  const priceCols = category.priceColumns;

  const th = "px-3 py-2 text-left text-[11px] font-semibold text-white whitespace-nowrap";
  const td = "px-3 py-2 text-[13px] align-top";
  const cellBorder = { border: `1px solid ${CELL_BORDER}` };

  if (items.length === 0) {
    return (
      <div className="card-surface p-8 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
        No rates in this tab yet.
      </div>
    );
  }

  return (
    <div className="card-surface overflow-x-auto">
      <table className="text-sm border-collapse" style={{ minWidth: "100%" }}>
        <thead>
          <tr style={{ background: HEADER_GREEN }}>
            <th className={th} style={cellBorder} rowSpan={2}>
              Name
            </th>
            {baseFields.map((f) => (
              <th key={f.key} className={th} style={cellBorder} rowSpan={2}>
                {f.label}
              </th>
            ))}
            {seasons.length === 0 ? (
              <th className={th} style={cellBorder} colSpan={Math.max(priceCols.length, 1)}>
                Season
              </th>
            ) : (
              seasons.map((s) => (
                <th key={s.label} className={`${th} text-center`} style={cellBorder} colSpan={priceCols.length}>
                  <div>Season</div>
                  <div className="font-normal opacity-90 normal-case">{s.label}</div>
                </th>
              ))
            )}
          </tr>
          <tr style={{ background: HEADER_GREEN_DARK }}>
            {(seasons.length === 0 ? [null] : seasons).flatMap((s, sIdx) =>
              priceCols.map((col) => (
                <th key={`${sIdx}-${col.id}`} className={`${th} text-center`} style={cellBorder}>
                  {col.label}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ background: "var(--color-card)" }}>
              <td className={`${td} font-semibold`} style={{ ...cellBorder, minWidth: 220 }}>
                {item.name}
                {item.description && (
                  <p className="font-normal text-xs mt-1 line-clamp-3" style={{ color: "var(--color-text-secondary)" }}>
                    {item.description}
                  </p>
                )}
              </td>
              {baseFields.map((f) => (
                <td key={f.key} className={td} style={cellBorder}>
                  {fieldValue(item, f.key) || "—"}
                </td>
              ))}
              {(seasons.length === 0 ? [null] : seasons).flatMap((s, sIdx) => {
                const season = s ? item.seasons.find((x) => x.label === s.label) : item.seasons[0];
                return priceCols.map((col) => (
                  <td key={`${sIdx}-${col.id}`} className={`${td} text-right tabular-nums`} style={cellBorder}>
                    {season && season.prices[col.id] !== undefined ? formatCurrency(season.prices[col.id]) : "—"}
                  </td>
                ));
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
