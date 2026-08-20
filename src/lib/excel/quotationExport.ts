import * as XLSX from "xlsx";
import type { Quotation, TravelQuery, PricingBreakdown } from "@/types/domain";
import { CURRENCY_CODE } from "@/lib/currency";

export interface QuotationExportInput {
  quotation: Quotation;
  query: TravelQuery;
  pricing: PricingBreakdown;
  /** Sales role never sees supplier cost / profit / margin — same rule as the PDF and the on-screen table. */
  includeCostAndProfit: boolean;
}

/**
 * Builds an .xlsx workbook for one quotation: a summary sheet plus one sheet
 * per line-item category (Hotels / Transport / Activities). All amounts are
 * plain numbers formatted with the workbook's currency code, so the file
 * behaves like a normal spreadsheet (sortable, chartable, sum-able) rather
 * than a print-out.
 */
export function buildQuotationWorkbook({ quotation, query, pricing, includeCostAndProfit }: QuotationExportInput): Buffer {
  const wb = XLSX.utils.book_new();
  const moneyFmt = `"$"#,##0`;

  // --- Summary sheet -------------------------------------------------------
  const summaryRows: (string | number)[][] = [
    ["Quotation", quotation.id],
    ["Package", quotation.packageName],
    ["Status", quotation.status],
    ["Guest", query.guestName || query.contactPerson],
    ["Destination", query.destination],
    ["Travel Date", query.travelDate],
    ["Nights", query.numberOfNights],
    ["Adults", query.adults],
    ["Children", query.children],
    [],
    ["Currency", CURRENCY_CODE],
    ["Hotel Total", pricing.hotelTotal],
    ["Transport Total", pricing.transportTotal],
    ["Activities Total", pricing.activitiesTotal],
    ...(includeCostAndProfit ? ([["Cost Total", pricing.costTotal]] as (string | number)[][]) : []),
    ["Selling Subtotal", pricing.sellingSubtotal],
    ["Markup %", pricing.markupPercent],
    ["Discount %", pricing.discountPercent],
    ["GST %", pricing.gstPercent],
    ["Final Selling Price", pricing.finalSellingPrice],
    ...(includeCostAndProfit
      ? ([
          ["Profit", pricing.profit],
          ["Margin %", pricing.margin],
        ] as (string | number)[][])
      : []),
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  summaryWs["!cols"] = [{ wch: 22 }, { wch: 28 }];
  applyMoneyFormat(summaryWs, summaryRows, moneyFmt, [
    "Hotel Total", "Transport Total", "Activities Total", "Cost Total",
    "Selling Subtotal", "Final Selling Price", "Profit",
  ]);
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  // --- Hotels ----------------------------------------------------------------
  const hotelHeader = includeCostAndProfit
    ? ["Hotel", "City", "Nights", "Rooms", "Cost", "Selling"]
    : ["Hotel", "City", "Nights", "Rooms", "Selling"];
  const hotelRows = quotation.hotelLines.map((h) =>
    includeCostAndProfit
      ? [h.hotelName, h.city, h.nights, h.rooms, h.costPrice, h.sellingPrice]
      : [h.hotelName, h.city, h.nights, h.rooms, h.sellingPrice]
  );
  addLineItemSheet(wb, "Hotels", hotelHeader, hotelRows, moneyFmt);

  // --- Transport ---------------------------------------------------------
  const transportHeader = includeCostAndProfit
    ? ["Vehicle Type", "Day", "Cost", "Selling"]
    : ["Vehicle Type", "Day", "Selling"];
  const transportRows = quotation.transportLines.map((t) =>
    includeCostAndProfit
      ? [t.vehicleType, t.day, t.costPrice, t.sellingPrice]
      : [t.vehicleType, t.day, t.sellingPrice]
  );
  addLineItemSheet(wb, "Transport", transportHeader, transportRows, moneyFmt);

  // --- Activities ----------------------------------------------------------
  const activityHeader = includeCostAndProfit
    ? ["Activity", "Day", "Pax", "Cost", "Selling"]
    : ["Activity", "Day", "Pax", "Selling"];
  const activityRows = quotation.activityLines.map((a) =>
    includeCostAndProfit
      ? [a.activityName, a.day, a.pax, a.costPrice, a.sellingPrice]
      : [a.activityName, a.day, a.pax, a.sellingPrice]
  );
  addLineItemSheet(wb, "Activities", activityHeader, activityRows, moneyFmt);

  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return out as Buffer;
}

function addLineItemSheet(
  wb: XLSX.WorkBook,
  name: string,
  header: string[],
  rows: (string | number)[][],
  moneyFmt: string
) {
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = header.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
  const moneyCols = header.reduce<number[]>((acc, h, i) => {
    if (h === "Cost" || h === "Selling") acc.push(i);
    return acc;
  }, []);
  for (let r = 1; r <= rows.length; r++) {
    for (const c of moneyCols) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws[ref]) ws[ref].z = moneyFmt;
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, name);
}

function applyMoneyFormat(ws: XLSX.WorkSheet, rows: (string | number)[][], moneyFmt: string, labels: string[]) {
  rows.forEach((row, r) => {
    if (labels.includes(String(row[0]))) {
      const ref = XLSX.utils.encode_cell({ r, c: 1 });
      if (ws[ref]) ws[ref].z = moneyFmt;
    }
  });
}
