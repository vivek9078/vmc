import { headers } from "next/headers";
import { auditLogRepository } from "@/lib/repositories";
import type { AuditAction } from "@/types/domain";

async function getClientIp(): Promise<string | undefined> {
  const h = await headers();
  // Trust only the first hop's forwarded-for entry behind a single reverse proxy (Vercel/most PaaS).
  // If deploying behind additional untrusted proxies, adjust this to your infra's actual trusted header.
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return h.get("x-real-ip") ?? undefined;
}

export async function logAudit(entry: {
  userId: string;
  userEmail: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  details?: string;
}): Promise<void> {
  try {
    const ipAddress = await getClientIp();
    await auditLogRepository.record({ ...entry, ipAddress });
  } catch (err) {
    // Audit logging must never break the primary operation it's observing.
    // eslint-disable-next-line no-console
    console.error("[audit] failed to record entry:", err);
  }
}
