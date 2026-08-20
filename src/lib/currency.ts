// =============================================================================
// Single source of truth for the app's display currency. Every place that
// renders a price (inventory tables, quotation builder, dashboard, PDF,
// Excel export) should import from here instead of hardcoding a symbol or
// locale. To switch currency again later, this is the only file to touch.
// =============================================================================

export const CURRENCY_CODE = "USD";
export const CURRENCY_SYMBOL = "$";
export const CURRENCY_LOCALE = "en-US";

/** Formats a number as "$1,234" (or "$1,234.50" if it has cents). */
export function formatCurrency(value: number | undefined | null, opts?: { decimals?: number }): string {
  const n = value ?? 0;
  const decimals = opts?.decimals ?? (Number.isInteger(n) ? 0 : 2);
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currency: CURRENCY_CODE,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

/** Plain "1,234" number formatting (no symbol) for contexts like PDF/Excel that prefix their own symbol. */
export function formatNumber(value: number | undefined | null): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE).format(value ?? 0);
}
