import { detectLanguage } from "./normalize";
import { extractPassengers, extractDuration } from "./passengerDurationExtractor";
import { extractDates } from "./dateExtractor";
import { extractDestinations, extractHotelCategory } from "./destinationHotelExtractor";
import { extractTransport, extractActivities, extractMealPlan } from "./transportActivityMealExtractor";
import { extractBudget, extractSpecialRequirements, extractContactInfo } from "./budgetRequirementExtractor";
import type { ExtractedQueryFields, ExtractionResult, ExtractionStatusMap } from "./types";

export type { ExtractedQueryFields, ExtractionResult, ExtractionStatusMap, FieldStatus, DestinationBreakdownEntry } from "./types";

/**
 * Runs the full deterministic (no-LLM, no external API) extraction pipeline
 * over a piece of input text — pasted WhatsApp/text, or text already pulled
 * out of a PDF/image by the earlier stages of that pipeline. Every
 * extractor is a pure function over the same text; nothing here calls the
 * network. `activityCatalog` is optional and lets a caller pass in live
 * inventory names (e.g. from activityRepository.list()) to extend
 * recognition beyond the built-in keyword list.
 */
export function extractQueryFromText(rawText: string, activityCatalog: string[] = []): ExtractionResult {
  const fields: ExtractedQueryFields = {};
  const status: ExtractionStatusMap = {};

  extractPassengers(rawText, fields, status);
  extractDuration(rawText, fields, status);
  extractDates(rawText, fields, status);
  extractDestinations(rawText, fields, status);
  extractHotelCategory(rawText, fields, status);
  extractTransport(rawText, fields, status);
  extractActivities(rawText, fields, status, activityCatalog);
  extractMealPlan(rawText, fields, status);
  extractBudget(rawText, fields, status);
  extractSpecialRequirements(rawText, fields, status);
  extractContactInfo(rawText, fields, status);

  const sourceLanguage = detectLanguage(rawText);
  const needsReview = Object.values(status).some((s) => s === "Needs Review");

  return { fields, status, sourceLanguage, needsReview };
}
