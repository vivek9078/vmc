"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createQuotationAction } from "./quotation/[quotationId]/actions";

export function CreateQuotationButton({ queryId }: { queryId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const quotation = await createQuotationAction(queryId, "Standard");
    router.push(`/queries/${queryId}/quotation/${quotation.id}`);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-transform hover:scale-[1.02] disabled:opacity-60"
      style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
    >
      {loading ? "Creating…" : "Create Quotation"}
    </button>
  );
}
