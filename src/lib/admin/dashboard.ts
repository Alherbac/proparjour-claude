import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFileAttenteKyc, statutAffiche } from "@/lib/admin/kyc";
import { getPrestatairesInactifs, type PeriodeFiltre } from "@/lib/admin/pilotage";

const SEUIL_INACTIVITE = 30;
const SEUIL_ANNULATIONS_RECRUTEUR = 2;

function dateDebutPeriode(periode: PeriodeFiltre): string | null {
  if (periode === "tout") return null;
  const jours = periode === "7j" ? 7 : periode === "30j" ? 30 : 90;
  const date = new Date();
  date.setDate(date.getDate() - jours);
  return date.toISOString();
}

export type ResumeATraiter = {
  kycEnAttente: number;
  offresSansCandidature: number;
  offresExpirees: number;
  missionsLitige: number;
  paiementsProblematiques: number;
};

/**
 * File d'action prioritaire — chaque chiffre est une requête directe
 * sur les tables réelles, jamais une estimation. "Signalements" n'a
 * volontairement aucune entrée ici : aucune table de signalements
 * n'existe encore dans le schéma (voir audit), l'inventer produirait
 * un chiffre faux plutôt qu'absent.
 */
export async function getResumeATraiter(): Promise<ResumeATraiter> {
  const admin = createAdminClient();

  const [dossiersKyc, { data: offresPubliees }, { count: offresExpirees }, { count: missionsLitige }, { count: paiementsEchec }, { count: paiementsRembourses }] =
    await Promise.all([
      getFileAttenteKyc(),
      admin.from("offres").select("id").eq("statut", "publiee"),
      admin.from("offres").select("*", { count: "exact", head: true }).eq("statut", "expiree"),
      admin.from("missions").select("*", { count: "exact", head: true }).eq("statut", "litige"),
      admin.from("paiements").select("*", { count: "exact", head: true }).eq("statut", "echec"),
      admin.from("paiements").select("*", { count: "exact", head: true }).eq("statut", "rembourse"),
    ]);

  const kycEnAttente = dossiersKyc.filter((d) => {
    const statut = statutAffiche(d);
    return statut !== "valide" && statut !== "refuse";
  }).length;

  const offreIdsPubliees = (offresPubliees ?? []).map((o) => o.id);
  const { data: candidaturesSurOffresPubliees } =
    offreIdsPubliees.length > 0
      ? await admin.from("candidatures").select("offre_id").in("offre_id", offreIdsPubliees)
      : { data: [] as { offre_id: string }[] };
  const offresAvecCandidature = new Set((candidaturesSurOffresPubliees ?? []).map((c) => c.offre_id));
  const offresSansCandidature = offreIdsPubliees.filter((id) => !offresAvecCandidature.has(id)).length;

  return {
    kycEnAttente,
    offresSansCandidature,
    offresExpirees: offresExpirees ?? 0,
    missionsLitige: missionsLitige ?? 0,
    paiementsProblematiques: (paiementsEchec ?? 0) + (paiementsRembourses ?? 0),
  };
}

export type ActivitePlateforme = {
  nouveauxClients: number;
  nouveauxPrestataires: number;
  offresPubliees: number;
  missionsRealisees: number;
  candidatures: number;
  candidaturesAcceptees: number;
  volumeFinancier: number;
  tauxConversion: number | null;
};

/**
 * KPIs d'activité sur la période — "taux de conversion" n'a pas de
 * définition existante ailleurs dans l'app, je le définis ici
 * explicitement comme candidatures acceptées ÷ candidatures totales
 * de la période (voir libellé affiché) plutôt que de le laisser
 * ambigu.
 */
export async function getActivitePlateforme(periode: PeriodeFiltre): Promise<ActivitePlateforme> {
  const admin = createAdminClient();
  const depuis = dateDebutPeriode(periode);

  let clientsQuery = admin
    .from("users")
    .select("*", { count: "exact", head: true })
    .in("type", ["recruteur_particulier", "recruteur_entreprise"]);
  let prestatairesQuery = admin.from("users").select("*", { count: "exact", head: true }).eq("type", "prestataire");
  let offresQuery = admin.from("offres").select("*", { count: "exact", head: true });
  let missionsRealiseesQuery = admin.from("missions").select("*", { count: "exact", head: true }).eq("statut", "terminee");
  let candidaturesQuery = admin.from("candidatures").select("*", { count: "exact", head: true });
  let candidaturesAccepteesQuery = admin
    .from("candidatures")
    .select("*", { count: "exact", head: true })
    .eq("statut", "acceptee");
  let paiementsQuery = admin.from("paiements").select("montant, created_at").in("statut", ["sequestre", "libere"]);

  if (depuis) {
    clientsQuery = clientsQuery.gte("created_at", depuis);
    prestatairesQuery = prestatairesQuery.gte("created_at", depuis);
    offresQuery = offresQuery.gte("created_at", depuis);
    missionsRealiseesQuery = missionsRealiseesQuery.gte("created_at", depuis);
    candidaturesQuery = candidaturesQuery.gte("created_at", depuis);
    candidaturesAccepteesQuery = candidaturesAccepteesQuery.gte("created_at", depuis);
    paiementsQuery = paiementsQuery.gte("created_at", depuis);
  }

  const [
    { count: nouveauxClients },
    { count: nouveauxPrestataires },
    { count: offresPubliees },
    { count: missionsRealisees },
    { count: candidatures },
    { count: candidaturesAcceptees },
    { data: paiements },
  ] = await Promise.all([
    clientsQuery,
    prestatairesQuery,
    offresQuery,
    missionsRealiseesQuery,
    candidaturesQuery,
    candidaturesAccepteesQuery,
    paiementsQuery,
  ]);

  const volumeFinancier = (paiements ?? []).reduce((somme, p) => somme + Number(p.montant), 0);

  return {
    nouveauxClients: nouveauxClients ?? 0,
    nouveauxPrestataires: nouveauxPrestataires ?? 0,
    offresPubliees: offresPubliees ?? 0,
    missionsRealisees: missionsRealisees ?? 0,
    candidatures: candidatures ?? 0,
    candidaturesAcceptees: candidaturesAcceptees ?? 0,
    volumeFinancier: Math.round(volumeFinancier * 100) / 100,
    tauxConversion: candidatures && candidatures > 0 ? Math.round(((candidaturesAcceptees ?? 0) / candidatures) * 1000) / 10 : null,
  };
}

export type EffectifsTotaux = {
  totalUtilisateurs: number;
  totalPrestataires: number;
  totalClients: number;
  missionsEnCours: number;
  volumeAffairesTotal: number;
  commissionsTotal: number;
};

/**
 * Compteurs cumulés depuis le lancement — distincts de
 * getActivitePlateforme (deltas sur une période) : les 7 cartes KPI
 * du tableau de bord (§5.1) affichent un total, pas une variation.
 */
export async function getEffectifsTotaux(): Promise<EffectifsTotaux> {
  const admin = createAdminClient();
  const [
    { count: totalUtilisateurs },
    { count: totalPrestataires },
    { count: totalClients },
    { count: missionsEnCours },
    { data: paiementsActifs },
  ] = await Promise.all([
    admin.from("users").select("*", { count: "exact", head: true }),
    admin.from("users").select("*", { count: "exact", head: true }).eq("type", "prestataire"),
    admin.from("users").select("*", { count: "exact", head: true }).in("type", ["recruteur_particulier", "recruteur_entreprise"]),
    admin.from("missions").select("*", { count: "exact", head: true }).in("statut", ["confirmee", "en_cours"]),
    admin.from("paiements").select("montant, montant_commission").in("statut", ["sequestre", "libere"]),
  ]);

  const volumeAffairesTotal = (paiementsActifs ?? []).reduce((s, p) => s + Number(p.montant), 0);
  const commissionsTotal = (paiementsActifs ?? []).reduce((s, p) => s + Number(p.montant_commission), 0);

  return {
    totalUtilisateurs: totalUtilisateurs ?? 0,
    totalPrestataires: totalPrestataires ?? 0,
    totalClients: totalClients ?? 0,
    missionsEnCours: missionsEnCours ?? 0,
    volumeAffairesTotal: Math.round(volumeAffairesTotal * 100) / 100,
    commissionsTotal: Math.round(commissionsTotal * 100) / 100,
  };
}

export type InscritsParMetier = {
  metier: string;
  label: string;
  couleur: string;
  total: number;
  valides: number;
  enAttente: number;
  refuses: number;
};

/**
 * Panneau "Inscrits par métier" (§5.1) — familles depuis
 * `config/metiers.ts` (config réelle de l'app, jamais codées en dur
 * ici), effectifs depuis `prestataires_profils.statut_verification`.
 * Le libellé "suspendus" du prompt devient "refusés" : aucune
 * distinction suspension/refus KYC n'existe dans le schéma (seul
 * `statut_verification` existe) — refléter le vrai statut plutôt que
 * d'inventer une troisième catégorie. Voir rapport final.
 */
export async function getInscritsParMetier(): Promise<{ familles: InscritsParMetier[]; total: number }> {
  const { METIERS } = await import("@/config/metiers");
  const admin = createAdminClient();
  const { data: profils } = await admin.from("prestataires_profils").select("metier, statut_verification");
  const lignes = profils ?? [];

  const familles = METIERS.map((m) => {
    const deLaFamille = lignes.filter((p) => p.metier === m.id);
    return {
      metier: m.id,
      label: m.filiere,
      couleur: m.accent.bg,
      total: deLaFamille.length,
      valides: deLaFamille.filter((p) => p.statut_verification === "valide").length,
      enAttente: deLaFamille.filter((p) => p.statut_verification === "en_attente").length,
      refuses: deLaFamille.filter((p) => p.statut_verification === "refuse").length,
    };
  });

  return { familles, total: lignes.length };
}

export type PrestataireDocumentProbleme = {
  userId: string;
  profilId: string;
  prenom: string | null;
  nom: string | null;
  motifRefus: string | null;
};

export type Surveillance = {
  nbPrestatairesInactifs: number;
  prestatairesDocumentsProblematiques: PrestataireDocumentProbleme[];
  nbRecruteursASurveiller: number;
};

/**
 * Signaux de surveillance qui ont une définition réelle et déjà
 * établie ailleurs dans l'app (mêmes seuils que /admin/pilotage).
 * "Anomalies de mission" et "missions inhabituelles" ne figurent
 * volontairement pas ici — aucune détection de ce type n'existe dans
 * le schéma (voir audit), les afficher inventerait un signal.
 */
export async function getSurveillance(): Promise<Surveillance> {
  const admin = createAdminClient();

  const [inactifs, { data: refuses }, { data: missionsAnnulees }] = await Promise.all([
    getPrestatairesInactifs(SEUIL_INACTIVITE),
    admin
      .from("prestataires_profils")
      .select("id, user_id, motif_refus")
      .eq("statut_verification", "refuse")
      .eq("visible", true),
    admin.from("missions").select("recruteur_id").eq("statut", "annulee"),
  ]);

  const userIds = (refuses ?? []).map((p) => p.user_id);
  const { data: users } =
    userIds.length > 0
      ? await admin.from("users").select("id, prenom, nom").in("id", userIds)
      : { data: [] as { id: string; prenom: string | null; nom: string | null }[] };
  const userParId = new Map((users ?? []).map((u) => [u.id, u]));

  const annulationsParRecruteur = new Map<string, number>();
  for (const m of missionsAnnulees ?? []) {
    annulationsParRecruteur.set(m.recruteur_id, (annulationsParRecruteur.get(m.recruteur_id) ?? 0) + 1);
  }
  const nbRecruteursASurveiller = [...annulationsParRecruteur.values()].filter(
    (n) => n >= SEUIL_ANNULATIONS_RECRUTEUR,
  ).length;

  return {
    nbPrestatairesInactifs: inactifs.length,
    prestatairesDocumentsProblematiques: (refuses ?? []).map((p) => {
      const user = userParId.get(p.user_id);
      return {
        userId: p.user_id,
        profilId: p.id,
        prenom: user?.prenom ?? null,
        nom: user?.nom ?? null,
        motifRefus: p.motif_refus,
      };
    }),
    nbRecruteursASurveiller,
  };
}
