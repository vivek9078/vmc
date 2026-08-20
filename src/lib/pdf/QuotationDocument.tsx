import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Quotation, TravelQuery } from "@/types/domain";
import { format } from "date-fns";

/**
 * CRITICAL: this component only ever receives `pricing.finalSellingPrice`
 * (never `pricing.costTotal`, `.profit`, or `.margin`) and never receives
 * `quotation.internalComments`. Enforce that at the call site
 * (src/app/(app)/queries/[id]/quotation/[quotationId]/pdf/*), not just here —
 * this file being "customer-only" is a convention, not a technical barrier,
 * so callers must not pass sensitive fields in as props.
 */

const COLORS = {
  teal: "#0F5C56",
  tealLight: "#E3F3F1",
  ocean: "#1E6FB8",
  text: "#101828",
  textMuted: "#667085",
  border: "#E5E7EB",
};

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: COLORS.text, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  logoBadge: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.teal,
    color: "#fff", fontSize: 12, fontFamily: "Helvetica-Bold",
    display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", paddingTop: 11,
  },
  companyName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: COLORS.teal },
  quoteId: { fontSize: 9, color: COLORS.textMuted, marginTop: 2 },
  summaryBar: {
    flexDirection: "row", backgroundColor: COLORS.tealLight, borderRadius: 8,
    padding: 12, marginBottom: 16, justifyContent: "space-between",
  },
  summaryItem: { flexDirection: "column" },
  summaryLabel: { fontSize: 7, color: COLORS.teal, textTransform: "uppercase", marginBottom: 2 },
  summaryValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: COLORS.text },
  sectionTitle: {
    fontSize: 11, fontFamily: "Helvetica-Bold", color: COLORS.teal,
    marginTop: 14, marginBottom: 6, borderBottom: `1pt solid ${COLORS.border}`, paddingBottom: 4,
  },
  row: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 5, borderBottom: `0.5pt solid ${COLORS.border}`,
  },
  rowLabel: { fontFamily: "Helvetica-Bold" },
  rowMeta: { fontSize: 8, color: COLORS.textMuted, marginTop: 1 },
  totalBox: {
    marginTop: 16, backgroundColor: COLORS.tealLight, borderRadius: 8, padding: 14,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  totalLabel: { fontSize: 9, color: COLORS.teal },
  totalValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: COLORS.teal },
  termsText: { fontSize: 8, color: COLORS.textMuted, lineHeight: 1.5, marginTop: 4 },
  footer: {
    position: "absolute", bottom: 24, left: 36, right: 36,
    flexDirection: "row", justifyContent: "space-between",
    fontSize: 7, color: COLORS.textMuted, borderTop: `0.5pt solid ${COLORS.border}`, paddingTop: 6,
  },
});

interface QuotationPdfProps {
  quotation: Pick<Quotation, "id" | "packageName" | "hotelLines" | "transportLines" | "activityLines">;
  query: Pick<TravelQuery, "destination" | "travelDate" | "numberOfNights" | "adults" | "children"> & { guestName: string };
  /** Only the customer-safe subset — see the module doc comment above. */
  finalSellingPrice: number;
  currency?: string;
}

export function QuotationPdfDocument({ quotation, query, finalSellingPrice, currency = "$" }: QuotationPdfProps) {
  return (
    <Document title={`Quotation ${quotation.id}`} author="Vietnam DMC">
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={styles.logoBadge}>VD</Text>
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.companyName}>Vietnam DMC</Text>
              <Text style={styles.quoteId}>Quotation {quotation.id}</Text>
            </View>
          </View>
          <View>
            <Text style={{ fontSize: 9, color: COLORS.textMuted }}>{format(new Date(), "d MMM yyyy")}</Text>
          </View>
        </View>

        <View style={styles.summaryBar}>
          <SummaryItem label="Guest" value={query.guestName} />
          <SummaryItem label="Destination" value={query.destination} />
          <SummaryItem label="Travel Date" value={format(new Date(query.travelDate), "d MMM yyyy")} />
          <SummaryItem label="Duration" value={`${query.numberOfNights}N / ${query.numberOfNights + 1}D`} />
          <SummaryItem label="Pax" value={`${query.adults} Adults${query.children ? `, ${query.children} Children` : ""}`} />
          <SummaryItem label="Package" value={quotation.packageName} />
        </View>

        {quotation.hotelLines.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Hotels</Text>
            {quotation.hotelLines.map((l) => (
              <View key={l.id} style={styles.row}>
                <View>
                  <Text style={styles.rowLabel}>{l.hotelName}</Text>
                  <Text style={styles.rowMeta}>{l.city} · {l.nights} nights · {l.rooms} room(s)</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {quotation.transportLines.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Transport</Text>
            {quotation.transportLines.map((l) => (
              <View key={l.id} style={styles.row}>
                <Text style={styles.rowLabel}>{l.vehicleType}</Text>
                <Text style={styles.rowMeta}>Day {l.day}</Text>
              </View>
            ))}
          </View>
        )}

        {quotation.activityLines.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Activities</Text>
            {quotation.activityLines.map((l) => (
              <View key={l.id} style={styles.row}>
                <View>
                  <Text style={styles.rowLabel}>{l.activityName}</Text>
                  <Text style={styles.rowMeta}>Day {l.day} · {l.pax} pax</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total Package Price</Text>
          <Text style={styles.totalValue}>{currency}{finalSellingPrice.toLocaleString("en-US")}</Text>
        </View>

        <Text style={styles.sectionTitle}>Terms & Notes</Text>
        <Text style={styles.termsText}>
          Prices are valid for 7 days from the date of this quotation and are subject to availability
          at the time of confirmation. A booking is confirmed only upon receipt of the required
          advance payment. Cancellation and rescheduling are subject to each hotel/supplier&apos;s
          individual policy, available on request. This quotation is issued by Vietnam DMC and is
          intended solely for the named guest above.
        </Text>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Vietnam DMC · quotes@vietnamdmc.example  |  Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "column" }}>
      <Text style={{ fontSize: 7, color: COLORS.teal, textTransform: "uppercase", marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold" }}>{value}</Text>
    </View>
  );
}
