import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PrestatairesProfilsRow, JustificatifsRow } from "@/lib/supabase/database.types";

export type DossierKyc = {
  profil: PrestatairesProfilsRow;
  user: { id: string; prenom: string | null; nom: string | null; telephone: string | null };
  justificatifs: JustificatifsRow[];
  documentDejaDemande: boolean;
};

export { DOCUMENTS_REQUIS, statutAffiche, type StatutAffiche } from "@/config/documents-requis";

async function construireDossiers(
  admin: ReturnType<typeof createAdminClient>,
  profils: PrestatairesProfilsRow[],
): Promise<DossierKyc[]> {
  if (profils.length === 0) return [];

  const userIds = [...new Set(profils.map((p) => p.user_id))];
  const profilIds = profils.map((p) => p.id);

  const [{ data: users }, { data: justificatifs }, { data: notifs }] = await Promise.all([
    admin.from("users").select("id, prenom, nom, telephone").in("id", userIds),
    admin.from("justificatifs").select("*").in("prestataire_id", profilIds),
    admin
      .from("notifications")
      .select("user_id")
      .eq("type", "document_demande")
      .in("user_id", userIds),
  ]);

  const parUser = new Map((users ?? []).map((u) => [u.id, u]));
  const usersContactes = new Set((notifs ?? []).map((n) => n.user_id));

  return profils.map((profil) => ({
    profil,
    user: parUser.get(profil.user_id) ?? {
      id: profil.user_id,
      prenom: null,
      nom: null,
      telephone: null,
    },
    justificatifs: (justificatifs ?? []).filter((j) => j.prestataire_id === profil.id),
    documentDejaDemande: usersContactes.has(profil.user_id),
  }));
}

/**
 * File d'attente triée par ancienneté (les plus vieux dossiers en
 * attente en premier). Tous les statuts sont récupérés — le tri par
 * onglet (à traiter/validés/refusés) se fait côté écran.
 */
export async function getFileAttenteKyc(): Promise<DossierKyc[]> {
  const admin = createAdminClient();
  const { data: profils } = await admin
    .from("prestataires_profils")
    .select("*")
    .order("created_at", { ascending: true });
  return construireDossiers(admin, profils ?? []);
}

export async function getDossierKyc(profilId: string): Promise<DossierKyc | null> {
  const admin = createAdminClient();
  const { data: profil } = await admin
    .from("prestataires_profils")
    .select("*")
    .eq("id", profilId)
    .maybeSingle();
  if (!profil) return null;
  const dossiers = await construireDossiers(admin, [profil]);
  return dossiers[0] ?? null;
}
