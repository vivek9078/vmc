"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { queryRepository, activityRepository } from "@/lib/repositories";
import { extractQueryFromText, type ExtractionResult } from "@/lib/queryExtraction";
import { validateUploadedFile, extractTextFromPdf, extractTextFromImage } from "@/lib/queryExtraction/fileProcessing";
import type { QuerySourceType } from "@/types/domain";

export interface IntakeExtractionResponse {
  ok: boolean;
  error?: string;
  result?: ExtractionResult;
  originalInputText?: string;
  sourceType?: QuerySourceType;
  uploadedFileName?: string;
}

/**
 * WhatsApp/Text input path: runs the rule-based extractor over pasted text
 * and returns a DRAFT for human review. Nothing is saved to
 * database/data.xlsx at this step — see approveQueryDraftAction.
 */
export async function extractQueryFromTextAction(rawText: string): Promise<IntakeExtractionResponse> {
  const ctx = await requireAuth("query.create");

  const text = rawText.trim();
  if (!text) return { ok: false, error: "Paste some text first." };
  if (text.length > 20000) return { ok: false, error: "That text is too long — please shorten it." };

  const catalog = (await activityRepository.list()).map((a) => a.name);
  const result = extractQueryFromText(text, catalog);

  await logAudit({
    userId: ctx.userId, userEmail: ctx.email, action: "extract",
    entityType: "Query", details: "WhatsApp/Text extraction run",
  });

  return { ok: true, result, originalInputText: text, sourceType: "WhatsApp/Text" };
}

/**
 * Image/PDF input path: validates the upload, extracts text locally
 * (OCR for images, direct text extraction for text-based PDFs — see
 * src/lib/queryExtraction/fileProcessing.ts), then runs the same
 * rule-based extractor used by the WhatsApp/Text path. The file itself is
 * processed in memory only and never written to disk or any public
 * directory. Nothing is saved to the Query repository at this step.
 */
export async function extractQueryFromFileAction(formData: FormData): Promise<IntakeExtractionResponse> {
  const ctx = await requireAuth("query.create");

  const file = formData.get("file");
  const kind = formData.get("kind");
  if (!(file instanceof File) || (kind !== "image" && kind !== "pdf")) {
    return { ok: false, error: "No file was uploaded." };
  }

  const validation = validateUploadedFile(file, kind);
  if (!validation.ok) return { ok: false, error: validation.error };

  const buffer = Buffer.from(await file.arrayBuffer());
  const extraction = kind === "pdf" ? await extractTextFromPdf(buffer) : await extractTextFromImage(buffer);
  if (!extraction.ok || !extraction.text) {
    return { ok: false, error: extraction.error ?? "Could not read that file." };
  }

  const catalog = (await activityRepository.list()).map((a) => a.name);
  const result = extractQueryFromText(extraction.text, catalog);
  const sourceType: QuerySourceType = kind === "pdf" ? "PDF" : "Image";

  await logAudit({
    userId: ctx.userId, userEmail: ctx.email, action: "extract",
    entityType: "Query", details: `${sourceType} extraction run (${file.name}, OCR: ${extraction.usedOcr ? "yes" : "no"})`,
  });

  return { ok: true, result, originalInputText: extraction.text, sourceType, uploadedFileName: file.name };
}

const approveDraftSchema = z.object({
  contactPerson: z.string().min(1, "Contact person is required").max(120),
  querySource: z.string().min(1).max(80),
  destination: z.string().min(1, "Destination is required").max(200),
  travelDate: z.string().optional(),
  numberOfNights: z.number().int().min(0).optional(),
  adults: z.number().int().min(1, "At least 1 adult is required"),
  children: z.number().int().min(0).optional(),
  infants: z.number().int().min(0).optional(),
  rooms: z.number().int().min(0).optional(),
  departureDate: z.string().optional(),
  durationDays: z.number().int().min(0).optional(),
  hotelCategory: z.string().max(60).optional(),
  mealPlan: z.string().max(60).optional(),
  transportPreference: z.string().max(60).optional(),
  airportTransfer: z.boolean().optional(),
  activitiesList: z.array(z.string()).optional(),
  budgetAmount: z.number().min(0).optional(),
  budgetCurrency: z.string().max(10).optional(),
  destinationBreakdown: z.string().optional(),
  guestName: z.string().max(120).optional(),
  guestEmail: z.string().max(200).email().optional().or(z.literal("")),
  phoneNumber: z.string().max(20).optional(),
  specialNotes: z.string().max(2000).optional(),
  sourceType: z.enum(["Manual", "Image", "PDF", "WhatsApp/Text"]),
  sourceLanguage: z.string().max(40).optional(),
  originalInputText: z.string().max(20000).optional(),
  extractionStatusJson: z.string().max(4000).optional(),
  uploadedFileName: z.string().max(300).optional(),
});

export type ApproveDraftInput = z.infer<typeof approveDraftSchema>;

export interface ApproveDraftResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  queryId?: string;
}

/**
 * The only step in this whole flow that writes to the Query repository
 * (database/data.xlsx). Requires the human reviewer to have confirmed the
 * fields client-side; re-validates required fields server-side regardless.
 */
export async function approveQueryDraftAction(input: ApproveDraftInput): Promise<ApproveDraftResult> {
  const ctx = await requireAuth("query.create");

  const parsed = approveDraftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  const data = parsed.data;
  const now = new Date().toISOString();

  const record = await queryRepository.create({
    querySource: data.querySource,
    contactPerson: data.contactPerson,
    salesTeamUserId: ctx.userId,
    tags: [],
    destination: data.destination,
    travelDate: data.travelDate || now.slice(0, 10),
    numberOfNights: data.numberOfNights ?? 0,
    adults: data.adults,
    children: data.children ?? 0,
    guestName: data.guestName,
    guestEmail: data.guestEmail || undefined,
    phoneNumber: data.phoneNumber,
    specialNotes: data.specialNotes,

    departureDate: data.departureDate,
    durationDays: data.durationDays,
    infants: data.infants,
    rooms: data.rooms,
    hotelCategory: data.hotelCategory,
    mealPlan: data.mealPlan,
    transportPreference: data.transportPreference,
    airportTransfer: data.airportTransfer,
    activitiesList: data.activitiesList,
    budgetAmount: data.budgetAmount,
    budgetCurrency: data.budgetCurrency,
    destinationBreakdown: data.destinationBreakdown,

    sourceType: data.sourceType,
    sourceLanguage: data.sourceLanguage,
    originalInputText: data.originalInputText,
    extractionStatusJson: data.extractionStatusJson,
    reviewStatus: "Approved",
    approvedByUserId: ctx.userId,
    approvedAt: now,
    uploadedFileName: data.uploadedFileName,
  });

  await logAudit({
    userId: ctx.userId, userEmail: ctx.email, action: "create",
    entityType: "Query", entityId: record.id,
    details: `Approved from ${data.sourceType} intake draft`,
  });

  return { ok: true, queryId: record.id };
}
