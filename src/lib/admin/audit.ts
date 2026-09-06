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

export type LigneJournalAudit = {
  id: string;
  auteur: string;
  action: string;
  cibleType: string;
  cibleId: string;
  motif: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

/** Lecture du journal d'audit (§5.14, onglet Logs) — toutes les actions sensibles déjà journalisées par les Server Actions admin. */
export async function listerJournalAudit(limite = 150): Promise<LigneJournalAudit[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(limite);
  if (!data || data.length === 0) return [];

  const adminIds = [...new Set(data.map((l) => l.admin_id))];
  const { data: users } = await admin.from("users").select("id, prenom, nom").in("id", adminIds);
  const userParId = new Map((users ?? []).map((u) => [u.id, u]));

  return data.map((l) => {
    const u = userParId.get(l.admin_id);
    return {
      id: l.id,
      auteur: u ? `${u.prenom ?? ""} ${u.nom ?? ""}`.trim() || "Administrateur" : "Administrateur",
      action: l.action,
      cibleType: l.cible_type,
      cibleId: l.cible_id,
      motif: l.motif,
      details: l.details,
      createdAt: l.created_at,
    };
  });
}
