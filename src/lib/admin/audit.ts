import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Journalise une action admin sensible (cahier des charges §17) — avale ses propres erreurs, jamais bloquant. */
export async function journaliser(entry: {
  adminId: string;
  action: string;
  cibleType: string;
  cibleId: string;
  motif?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("admin_audit_log").insert({
    admin_id: entry.adminId,
    action: entry.action,
    cible_type: entry.cibleType,
    cible_id: entry.cibleId,
    motif: entry.motif ?? null,
    details: entry.details ?? null,
  });
}
