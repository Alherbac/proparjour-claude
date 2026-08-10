import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type PeriodeFiltre = "7j" | "30j" | "90j" | "tout";

function dateDebutPeriode(periode: PeriodeFiltre): string | null {
  if (periode === "tout") return null;
  const jours = periode === "7j" ? 7 : periode === "30j" ? 30 : 90;
  const date = new Date();
  date.setDate(date.getDate() - jours);
  return date.toISOString();
}

export type ScoreRisque = "bon" | "surveiller" | "eleve";

/**
 * Score de risque unifié (cahier des charges §6) : combine statut KYC,
 * annulations et litiges — jamais un seul indicateur isolé. Exporté
 * pour être réutilisé tel quel depuis la future fiche Utilisateurs
 * (§7), pas recalculé différemment à deux endroits.
 */
export function calculerScoreRisque(params: {
  statutVerification?: string;
  nbAnnulations: number;
  nbLitiges: number;
}): ScoreRisque {
  const { statutVerification, nbAnnulations, nbLitiges } = params;
  if (statutVerification === "refuse" || nbAnnulations >= 5 || nbLitiges >= 2) return "eleve";
  if (statutVerification === "en_attente" || nbAnnulations >= 2 || nbLitiges >= 1) return "surveiller";
  return "bon";
}

type ConnexionMap = Map<string, string | null>;

async function getDernieresConnexions(admin: ReturnType<typeof createAdminClient>): Promise<ConnexionMap> {
  const map: ConnexionMap = new Map();
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  for (const u of data?.users ?? []) {
    map.set(u.id, u.last_sign_in_at ?? null);
  }
  return map;
}

export type PrestataireActif = {
  userId: string;
  profilId: string;
  prenom: string | null;
  nom: string | null;
  metier: string;
  statutVerification: string;
  derniereConnexion: string | null;
  nbMissionsProposees: number;
  tauxAcceptation: number | null;
  nbAnnulations: number;
  nbLitiges: number;
  score: ScoreRisque;
};

/** Classement nominatif des prestataires les plus actifs, filtrable par période (cahier des charges §6). */
export async function getClassementPrestataires(periode: PeriodeFiltre): Promise<PrestataireActif[]> {
  const admin = createAdminClient();
  const depuis = dateDebutPeriode(periode);

  const [{ data: profils }, connexions] = await Promise.all([
    admin.from("prestataires_profils").select("id, user_id, metier, statut_verification"),
    getDernieresConnexions(admin),
  ]);
  if (!profils || profils.length === 0) return [];

  const profilIds = profils.map((p) => p.id);
  const userIds = profils.map((p) => p.user_id);

  let ligneQuery = admin
    .from("mission_lignes")
    .select("prestataire_id, statut_acceptation, mission_id, created_at")
    .in("prestataire_id", profilIds);
  if (depuis) ligneQuery = ligneQuery.gte("created_at", depuis);
  const { data: lignes } = await ligneQuery;

  const missionIds = [...new Set((lignes ?? []).map((l) => l.mission_id))];
  const { data: missions } =
    missionIds.length > 0
      ? await admin.from("missions").select("id, statut").in("id", missionIds)
      : { data: [] as { id: string; statut: string }[] };
  const statutParMission = new Map((missions ?? []).map((m) => [m.id, m.statut]));

  const { data: users } = await admin.from("users").select("id, prenom, nom").in("id", userIds);
  const userParId = new Map((users ?? []).map((u) => [u.id, u]));

  return profils.map((profil) => {
    const lignesProfil = (lignes ?? []).filter((l) => l.prestataire_id === profil.id);
    const acceptees = lignesProfil.filter((l) => l.statut_acceptation === "acceptee").length;
    const refusees = lignesProfil.filter((l) => l.statut_acceptation === "refusee").length;
    const decidees = acceptees + refusees;
    const nbLitiges = lignesProfil.filter((l) => statutParMission.get(l.mission_id) === "litige").length;
    const user = userParId.get(profil.user_id);

    return {
      userId: profil.user_id,
      profilId: profil.id,
      prenom: user?.prenom ?? null,
      nom: user?.nom ?? null,
      metier: profil.metier,
      statutVerification: profil.statut_verification,
      derniereConnexion: connexions.get(profil.user_id) ?? null,
      nbMissionsProposees: lignesProfil.length,
      tauxAcceptation: decidees > 0 ? Math.round((acceptees / decidees) * 100) : null,
      nbAnnulations: 0,
      nbLitiges,
      score: calculerScoreRisque({ statutVerification: profil.statut_verification, nbAnnulations: 0, nbLitiges }),
    };
  });
}

export type RecruteurActif = {
  userId: string;
  prenom: string | null;
  nom: string | null;
  derniereConnexion: string | null;
  nbMissionsPubliees: number;
  nbOffresPubliees: number;
  panierMoyen: number;
  nbAnnulations: number;
  score: ScoreRisque;
};

/** Classement nominatif des recruteurs les plus actifs (fréquence de publication, panier moyen). */
export async function getClassementRecruteurs(periode: PeriodeFiltre): Promise<RecruteurActif[]> {
  const admin = createAdminClient();
  const depuis = dateDebutPeriode(periode);

  const [{ data: recruteurs }, connexions] = await Promise.all([
    admin.from("users").select("id, prenom, nom").in("type", ["recruteur_particulier", "recruteur_entreprise"]),
    getDernieresConnexions(admin),
  ]);
  if (!recruteurs || recruteurs.length === 0) return [];

  const recruteurIds = recruteurs.map((r) => r.id);

  let missionQuery = admin.from("missions").select("recruteur_id, statut, montant_total, created_at").in("recruteur_id", recruteurIds);
  if (depuis) missionQuery = missionQuery.gte("created_at", depuis);
  let offreQuery = admin.from("offres").select("recruteur_id, created_at").in("recruteur_id", recruteurIds);
  if (depuis) offreQuery = offreQuery.gte("created_at", depuis);

  const [{ data: missions }, { data: offres }] = await Promise.all([missionQuery, offreQuery]);

  return recruteurs.map((recruteur) => {
    const missionsRecruteur = (missions ?? []).filter((m) => m.recruteur_id === recruteur.id);
    const nbAnnulations = missionsRecruteur.filter((m) => m.statut === "annulee").length;
    const nbOffresPubliees = (offres ?? []).filter((o) => o.recruteur_id === recruteur.id).length;
    const panierMoyen =
      missionsRecruteur.length > 0
        ? Math.round((missionsRecruteur.reduce((s, m) => s + Number(m.montant_total), 0) / missionsRecruteur.length) * 100) / 100
        : 0;

    return {
      userId: recruteur.id,
      prenom: recruteur.prenom,
      nom: recruteur.nom,
      derniereConnexion: connexions.get(recruteur.id) ?? null,
      nbMissionsPubliees: missionsRecruteur.length,
      nbOffresPubliees,
      panierMoyen,
      nbAnnulations,
      score: calculerScoreRisque({ nbAnnulations, nbLitiges: 0 }),
    };
  });
}

export type PrestataireInactif = {
  userId: string;
  profilId: string;
  prenom: string | null;
  nom: string | null;
  metier: string;
  derniereConnexion: string | null;
  joursInactivite: number | null;
};

/** Détection d'inactivité des prestataires validés — seuil configurable (cahier des charges §6). */
export async function getPrestatairesInactifs(seuilJours: number): Promise<PrestataireInactif[]> {
  const admin = createAdminClient();
  const [{ data: profils }, connexions] = await Promise.all([
    admin.from("prestataires_profils").select("id, user_id, metier").eq("statut_verification", "valide"),
    getDernieresConnexions(admin),
  ]);
  if (!profils || profils.length === 0) return [];

  const userIds = profils.map((p) => p.user_id);
  const { data: users } = await admin.from("users").select("id, prenom, nom").in("id", userIds);
  const userParId = new Map((users ?? []).map((u) => [u.id, u]));

  const maintenant = Date.now();
  return profils
    .map((profil) => {
      const derniereConnexion = connexions.get(profil.user_id) ?? null;
      const joursInactivite = derniereConnexion
        ? Math.floor((maintenant - new Date(derniereConnexion).getTime()) / 86_400_000)
        : null;
      const user = userParId.get(profil.user_id);
      return {
        userId: profil.user_id,
        profilId: profil.id,
        prenom: user?.prenom ?? null,
        nom: user?.nom ?? null,
        metier: profil.metier,
        derniereConnexion,
        joursInactivite,
      };
    })
    .filter((p) => p.joursInactivite === null || p.joursInactivite >= seuilJours)
    .sort((a, b) => (b.joursInactivite ?? Infinity) - (a.joursInactivite ?? Infinity));
}

const SEUIL_INACTIVITE_DEFAUT = 30;
const SEUIL_ALERTE_ANNULATIONS = 2;

/**
 * Compte léger pour le badge sidebar (cahier des charges §2 : le
 * badge doit correspondre exactement à ce que la page liste) — mêmes
 * seuils par défaut que /admin/pilotage sans filtre, une seule requête
 * listUsers plutôt que de réutiliser les fonctions de classement
 * complètes (qui sur-récupèrent pour cet usage).
 */
export async function getNombreAlertesPilotage(): Promise<number> {
  const admin = createAdminClient();
  const [{ data: profils }, { data: missions }, connexions] = await Promise.all([
    admin.from("prestataires_profils").select("user_id").eq("statut_verification", "valide"),
    admin.from("missions").select("recruteur_id, statut").eq("statut", "annulee"),
    getDernieresConnexions(admin),
  ]);

  const maintenant = Date.now();
  const nbInactifs = (profils ?? []).filter((p) => {
    const derniereConnexion = connexions.get(p.user_id);
    if (!derniereConnexion) return true;
    const jours = Math.floor((maintenant - new Date(derniereConnexion).getTime()) / 86_400_000);
    return jours >= SEUIL_INACTIVITE_DEFAUT;
  }).length;

  const annulationsParRecruteur = new Map<string, number>();
  for (const m of missions ?? []) {
    annulationsParRecruteur.set(m.recruteur_id, (annulationsParRecruteur.get(m.recruteur_id) ?? 0) + 1);
  }
  const nbAlertesAnnulations = [...annulationsParRecruteur.values()].filter((n) => n >= SEUIL_ALERTE_ANNULATIONS).length;

  return nbInactifs + nbAlertesAnnulations;
}

export type RepartitionVille = { ville: string; nbPrestataires: number };

/** Répartition de l'activité par ville — base de la carte géographique Île-de-France (cahier des charges §6). */
export async function getRepartitionGeographique(): Promise<RepartitionVille[]> {
  const admin = createAdminClient();
  const { data: profils } = await admin.from("prestataires_profils").select("ville");
  const compteur = new Map<string, number>();
  for (const p of profils ?? []) {
    const ville = p.ville?.trim() || "Non renseignée";
    compteur.set(ville, (compteur.get(ville) ?? 0) + 1);
  }
  return [...compteur.entries()]
    .map(([ville, nbPrestataires]) => ({ ville, nbPrestataires }))
    .sort((a, b) => b.nbPrestataires - a.nbPrestataires);
}
