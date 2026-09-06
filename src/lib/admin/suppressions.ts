import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type DemandeSuppressionAvecUser = {
  id: string;
  userId: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  type: string | null;
  motif: string | null;
  createdAt: string;
};

/** Compte des demandes en attente — pour le badge de la sidebar, sans charger les emails/profils de chaque demande. */
export async function getNombreDemandesSuppressionEnAttente(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("demandes_suppression_compte")
    .select("*", { count: "exact", head: true })
    .eq("statut", "en_attente");
  return count ?? 0;
}

/** File d'attente des demandes de suppression de compte "en_attente" — la ligne disparaît d'elle-même (cascade) une fois le compte réellement supprimé. */
export async function getDemandesSuppressionEnAttente(): Promise<DemandeSuppressionAvecUser[]> {
  const admin = createAdminClient();
  const { data: demandes } = await admin
    .from("demandes_suppression_compte")
    .select("id, user_id, motif, created_at")
    .eq("statut", "en_attente")
    .order("created_at", { ascending: true });
  if (!demandes || demandes.length === 0) return [];

  const userIds = demandes.map((d) => d.user_id);
  const { data: users } = await admin.from("users").select("id, prenom, nom, type").in("id", userIds);
  const userParId = new Map((users ?? []).map((u) => [u.id, u]));

  const emails = await Promise.all(
    userIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      return [id, data?.user?.email ?? null] as const;
    }),
  );
  const emailParId = new Map(emails);

  return demandesAvecInfos(demandes, userParId, emailParId);
}

export type LigneJournalSuppression = { compteAnonymise: string; role: string | null; motif: string | null; date: string };

/**
 * Journal des comptes déjà supprimés (§5.12) — lit `admin_audit_log`
 * (action="compte_supprime", posée par traiterDemandeSuppression) :
 * pas de nouvelle table, la trace existe déjà et respecte
 * l'anonymisation demandée (cible_id = uuid, jamais le nom — le
 * compte n'existe même plus au moment de la lecture).
 */
export async function getJournalSuppressions(limite = 100): Promise<LigneJournalSuppression[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_audit_log")
    .select("cible_id, motif, details, created_at")
    .eq("action", "compte_supprime")
    .order("created_at", { ascending: false })
    .limit(limite);

  return (data ?? []).map((l) => ({
    compteAnonymise: `${l.cible_id.slice(0, 8)}…`,
    role: (l.details as { role?: string } | null)?.role ?? null,
    motif: l.motif,
    date: l.created_at,
  }));
}

function demandesAvecInfos(
  demandes: { id: string; user_id: string; motif: string | null; created_at: string }[],
  userParId: Map<string, { prenom: string | null; nom: string | null; type: string | null }>,
  emailParId: Map<string, string | null>,
) {
  return demandes.map((d) => ({
    id: d.id,
    userId: d.user_id,
    prenom: userParId.get(d.user_id)?.prenom ?? null,
    nom: userParId.get(d.user_id)?.nom ?? null,
    email: emailParId.get(d.user_id) ?? null,
    type: userParId.get(d.user_id)?.type ?? null,
    motif: d.motif,
    createdAt: d.created_at,
  }));
}
