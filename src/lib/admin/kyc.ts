import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PrestatairesProfilsRow, JustificatifsRow } from "@/lib/supabase/database.types";
import { DOCUMENTS_REQUIS } from "@/config/documents-requis";

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

export type VerificationAuto = { label: string; ok: boolean; detail: string };

/**
 * Vérifications automatiques (§5.3) — uniquement celles qui ont une
 * donnée réelle derrière : ni SIRET (prestataires_profils n'a pas ce
 * champ, c'est un particulier, pas une entreprise) ni "dates de
 * validité" des pièces (aucune colonne d'expiration en base) ne sont
 * vérifiables ici — les inventer produirait un ✓/✗ faux plutôt qu'un
 * signal absent. Voir rapport final.
 */
export async function getVerificationsAutomatiques(
  dossier: DossierKyc,
  admin: ReturnType<typeof createAdminClient>,
): Promise<VerificationAuto[]> {
  const requis = DOCUMENTS_REQUIS[dossier.profil.metier] ?? [];
  const manquants = requis.filter((r) => !dossier.justificatifs.some((j) => j.type_document === r.type));
  const enAttente = dossier.justificatifs.filter((j) => j.statut === "en_attente");

  const checks: VerificationAuto[] = [
    {
      label: "Pièces requises",
      ok: manquants.length === 0,
      detail: manquants.length === 0 ? "Toutes les pièces requises sont fournies." : `${manquants.length} pièce(s) manquante(s).`,
    },
    {
      label: "Pièces en attente",
      ok: enAttente.length === 0,
      detail: enAttente.length === 0 ? "Aucune pièce en attente de décision." : `${enAttente.length} pièce(s) à traiter.`,
    },
  ];

  if (dossier.profil.metier === "securite") {
    checks.push({
      label: "Carte CNAPS déclarée",
      ok: Boolean(dossier.profil.numero_carte_cnaps),
      detail: dossier.profil.numero_carte_cnaps ? `N° ${dossier.profil.numero_carte_cnaps}` : "Aucun numéro déclaré.",
    });
  }

  if (dossier.user.telephone) {
    const { count } = await admin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("telephone", dossier.user.telephone)
      .neq("id", dossier.user.id);
    checks.push({
      label: "Absence de doublon",
      ok: (count ?? 0) === 0,
      detail: (count ?? 0) === 0 ? "Aucun autre compte avec ce téléphone." : `${count} autre(s) compte(s) avec ce téléphone.`,
    });
  }

  return checks;
}

/**
 * Indicateur composite déterministe (documents fournis/requis, statut,
 * ancienneté du compte) — même esprit que calculerScoreRisque
 * (lib/admin/pilotage.ts) : un signal calculé et explicable, jamais
 * un chiffre arbitraire.
 */
export function calculerCredibilite(dossier: DossierKyc): number {
  const requis = DOCUMENTS_REQUIS[dossier.profil.metier] ?? [];
  const fournis = requis.filter((r) => dossier.justificatifs.some((j) => j.type_document === r.type && j.statut === "valide"));
  const scoreDocuments = requis.length > 0 ? (fournis.length / requis.length) * 60 : 60;

  const scoreStatut =
    dossier.profil.statut_verification === "valide" ? 25 : dossier.profil.statut_verification === "refuse" ? 0 : 10;

  const joursInscrit = Math.floor((Date.now() - new Date(dossier.profil.created_at).getTime()) / 86_400_000);
  const scoreAnciennete = Math.min(15, Math.floor(joursInscrit / 7));

  return Math.round(Math.min(100, scoreDocuments + scoreStatut + scoreAnciennete));
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
