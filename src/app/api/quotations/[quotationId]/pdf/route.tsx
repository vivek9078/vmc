import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireAuth } from "@/lib/auth";
import { quotationRepository, queryRepository } from "@/lib/repositories";
import { calculatePricing } from "@/lib/pricing";
import { QuotationPdfDocument } from "@/lib/pdf/QuotationDocument";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ quotationId: string }> }
) {
  await requireAuth("query.view");

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

  // Only the customer-safe subset is passed in — see QuotationDocument.tsx's
  // module doc comment. Never pass pricing.costTotal / .profit / .margin or
  // quotation.internalComments here.
  const buffer = await renderToBuffer(
    <QuotationPdfDocument
      quotation={{
        id: quotation.id,
        packageName: quotation.packageName,
        hotelLines: quotation.hotelLines,
        transportLines: quotation.transportLines,
        activityLines: quotation.activityLines,
      }}
      query={{
        destination: query.destination,
        travelDate: query.travelDate,
        numberOfNights: query.numberOfNights,
        adults: query.adults,
        children: query.children,
        guestName: query.guestName || query.contactPerson,
      }}
      finalSellingPrice={pricing.finalSellingPrice}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quotation.id}.pdf"`,
    },
  });
}
