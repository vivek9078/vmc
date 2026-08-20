"use server";

import { requireAuth } from "@/lib/auth";
import { queryRepository, hotelRepository, supplierRepository } from "@/lib/repositories";

export interface GlobalSearchResult {
  type: "query" | "hotel" | "supplier";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export async function globalSearchAction(term: string): Promise<GlobalSearchResult[]> {
  await requireAuth();

  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  const [queries, hotels, suppliers] = await Promise.all([
    queryRepository.list({ search: trimmed }),
    hotelRepository.list({ search: trimmed }),
    supplierRepository.list({ search: trimmed }),
  ]);

  const results: GlobalSearchResult[] = [
    ...queries.slice(0, 5).map((q) => ({
      type: "query" as const,
      id: q.id,
      title: q.id,
      subtitle: `${q.guestName || q.contactPerson} · ${q.destination}`,
      href: `/queries/${q.id}`,
    })),
    ...hotels.slice(0, 5).map((h) => ({
      type: "hotel" as const,
      id: h.id,
      title: h.name,
      subtitle: `${h.city} · ${h.starRating}★`,
      href: `/hotels`,
    })),
    ...suppliers.slice(0, 5).map((s) => ({
      type: "supplier" as const,
      id: s.id,
      title: s.name,
      subtitle: s.company,
      href: `/suppliers`,
    })),
  ];

  return results;
}
