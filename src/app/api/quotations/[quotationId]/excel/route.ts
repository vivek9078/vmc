import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { quotationRepository, queryRepository } from "@/lib/repositories";
import { calculatePricing } from "@/lib/pricing";
import { buildQuotationWorkbook } from "@/lib/excel/quotationExport";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ quotationId: string }> }
) {
  const { permissions } = await requireAuth("query.view");

  const { quotationId } = await params;
  const quotation = await quotationRepository.get(quotationId);
  if (!quotation) {
    return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  }

  const query = await queryRepository.get(quotation.queryId);
  if (!query) {
    return NextResponse.json({ error: "Query not found" }, { status: 404 });
  }

  const pricing = calculatePricing(quotation);

  // Same rule as the on-screen table and the PDF: Sales never gets supplier
  // cost, profit, or margin — enforced here server-side, not trusted from UI.
  const includeCostAndProfit = hasPermission(permissions, "quotation.view_supplier_cost");

  const buffer = buildQuotationWorkbook({ quotation, query, pricing, includeCostAndProfit });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${quotation.id}.xlsx"`,
    },
  });
}
