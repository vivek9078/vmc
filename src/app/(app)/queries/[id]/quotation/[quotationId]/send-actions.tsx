"use server";

import { requireAuth } from "@/lib/auth";
import { quotationRepository, sentHistoryRepository } from "@/lib/repositories";
import { revalidatePath } from "next/cache";
import type { SendChannel } from "@/types/domain";

export interface RecordDraftInput {
  quotationId: string;
  channel: SendChannel;
  recipients: string[];
}

/**
 * The app no longer sends email/WhatsApp itself — the Documents tab
 * generates a mailto:/wa.me link (and a copy-to-clipboard button) entirely
 * client-side so the user sends it from their own mail app or WhatsApp.
 * This just logs that a draft was composed, for the Sent History /
 * Audit Logs trail.
 */
export async function recordMessageDraftAction(input: RecordDraftInput) {
  const ctx = await requireAuth("quotation.send");

  if (input.recipients.length === 0) {
    return { ok: false as const, error: "Add at least one recipient first." };
  }

  const quotation = await quotationRepository.get(input.quotationId);
  if (!quotation) return { ok: false as const, error: "Quotation not found." };

  const record = await sentHistoryRepository.record({
    quotationId: quotation.id,
    channel: input.channel,
    recipients: input.recipients,
    sentByUserId: ctx.userId,
    status: "drafted",
  });

  revalidatePath(`/queries/${quotation.queryId}/quotation/${quotation.id}`);
  return { ok: true as const, record };
}

export async function listSentHistoryAction(quotationId: string) {
  await requireAuth("query.view");
  return sentHistoryRepository.listForQuotation(quotationId);
}
