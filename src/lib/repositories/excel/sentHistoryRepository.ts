import { ExcelTable } from "./excelTable";
import type { SentHistoryRepository } from "../types";
import type { SentRecord } from "@/types/domain";

const COLUMNS = ["id", "quotationId", "channel", "recipients", "sentByUserId", "sentAt", "status"];

function rowToRecord(row: string[]): SentRecord {
  const [id, quotationId, channel, recipientsCsv, sentByUserId, sentAt] = row;
  return {
    id, quotationId,
    channel: (channel as SentRecord["channel"]) || "email",
    recipients: recipientsCsv ? recipientsCsv.split(",").map((r) => r.trim()).filter(Boolean) : [],
    sentByUserId, sentAt,
    status: "drafted",
  };
}

function recordToRow(r: SentRecord): string[] {
  return [r.id, r.quotationId, r.channel, r.recipients.join(", "), r.sentByUserId, r.sentAt, r.status];
}

export class ExcelSentHistoryRepository implements SentHistoryRepository {
  private table = new ExcelTable<SentRecord>("SentHistory", COLUMNS, rowToRecord, recordToRow);

  async listForQuotation(quotationId: string): Promise<SentRecord[]> {
    const all = await this.table.list();
    return all.filter((h) => h.quotationId === quotationId).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  }

  async record(entry: Omit<SentRecord, "id" | "sentAt">): Promise<SentRecord> {
    const record: SentRecord = {
      ...entry,
      id: `sent_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      sentAt: new Date().toISOString(),
    };
    return this.table.append(record);
  }
}
