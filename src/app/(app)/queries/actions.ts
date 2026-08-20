"use server";

import { requireAuth } from "@/lib/auth";
import { queryRepository } from "@/lib/repositories";
import { createQuerySchema, type CreateQueryInput } from "@/lib/schemas/query";

export interface CreateQueryResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  queryId?: string;
}

export async function createQueryAction(input: CreateQueryInput): Promise<CreateQueryResult> {
  const ctx = await requireAuth("query.create");

  const parsed = createQuerySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const data = parsed.data;

  const record = await queryRepository.create({
    querySource: data.querySource,
    contactPerson: data.contactPerson,
    referenceId: data.referenceId,
    salesTeamUserId: ctx.userId,
    tags: data.tags,
    destination: data.destination,
    travelDate: data.travelDate,
    numberOfNights: data.numberOfNights,
    adults: data.adults,
    children: data.children,
    guestName: data.guestName,
    guestEmail: data.guestEmail || undefined,
    phoneNumber: data.phoneNumber,
    specialNotes: data.specialNotes,
  });

  return { ok: true, queryId: record.id };
}

export async function listQueriesAction(filters?: { status?: string; search?: string }) {
  await requireAuth("query.view");
  return queryRepository.list(filters);
}
