import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClassementPrestataires, getClassementRecruteurs, getOffreDemandeParVille } from "@/lib/admin/pilotage";
import { getRepartitionParMetier, getRepartitionStatutMissions } from "@/lib/admin/statistiques";
import { getResumeCommissions } from "@/lib/admin/commissions";
import { getVisitesEtRecherches } from "@/lib/admin/analytics";
import { METIERS } from "@/config/metiers";

/**
 * Données du panneau Insights (§5.10, 6 onglets). Chaque tuile
 * documente sa propre source ; celles sans donnée réelle affichent
 * "non mesuré" plutôt qu'un chiffre inventé (§8) — surtout vrai ici :
 * aucun suivi de trafic/recherche n'existe dans le schéma, donc tout
 * ce qui en dépendrait (visites, recherches, vitesse de matching,
 * activation/rétention par cohorte) est honnêtement absent. Voir le
 * rapport final pour la liste de ces trous.
 */

export type EntonnoirEtape = { label: string; valeur: number; taux: number | null };

export async function getEntonnoirDirection(): Promise<EntonnoirEtape[]> {
  const admin = createAdminClient();
  const [{ count: demandes }, { count: contractees }, { count: terminees }, { visites, recherches }] = await Promise.all([
    admin.from("missions").select("*", { count: "exact", head: true }),
    admin.from("missions").select("*", { count: "exact", head: true }).in("statut", ["confirmee", "en_cours", "terminee"]),
    admin.from("missions").select("*", { count: "exact", head: true }).eq("statut", "terminee"),
    getVisitesEtRecherches(),
  ]);
  const d = demandes ?? 0;
  const c = contractees ?? 0;
  const t = terminees ?? 0;

  const etapes: EntonnoirEtape[] = [];
  // "Visites" n'apparaît qu'une fois la table `visites` non vide
  // (migration 0046) — avant ça, la même honnêteté qu'ailleurs :
  // pas d'étage à 0 fabriqué en tête d'entonnoir.
  if (visites > 0) {
    etapes.push({ label: "Visites", valeur: visites, taux: null });
    etapes.push({ label: "Recherches lancées", valeur: recherches, taux: visites > 0 ? Math.round((recherches / visites) * 1000) / 10 : null });
  }
  etapes.push({ label: "Demandes créées", valeur: d, taux: visites > 0 ? Math.round((d / visites) * 1000) / 10 : null });
  etapes.push({ label: "Missions contractées", valeur: c, taux: d > 0 ? Math.round((c / d) * 1000) / 10 : null });
  etapes.push({ label: "Missions terminées", valeur: t, taux: c > 0 ? Math.round((t / c) * 1000) / 10 : null });
  return etapes;
}

export type InsightsDirection = { croissanceNette: number; joursDepuisLancement: number };

export async function getInsightsDirection(): Promise<InsightsDirection> {
  const admin = createAdminClient();
  const [{ count: prestataires }, { data: premiereMission }] = await Promise.all([
    admin.from("users").select("*", { count: "exact", head: true }).eq("type", "prestataire"),
    admin.from("missions").select("created_at").order("created_at", { ascending: true }).limit(1).maybeSingle(),
  ]);
  const joursDepuisLancement = premiereMission
    ? Math.max(1, Math.floor((Date.now() - new Date(premiereMission.created_at).getTime()) / 86_400_000))
    : 0;
  return { croissanceNette: prestataires ?? 0, joursDepuisLancement };
}

export type InsightsMetiers = { famille: string; label: string; partMissions: number }[];

export async function getInsightsMetiers(): Promise<{ familles: InsightsMetiers; partMultiMetiers: number | null }> {
  const [repartition, admin] = [await getRepartitionParMetier(), createAdminClient()];
  const totalMissions = repartition.reduce((s, r) => s + r.nbMissions, 0);
  const familles = repartition.map((r) => ({
    famille: r.metier,
    label: r.label,
    partMissions: totalMissions > 0 ? Math.round((r.nbMissions / totalMissions) * 1000) / 10 : 0,
  }));

  const { data: lignes } = await admin.from("mission_lignes").select("mission_id, metier");
  const metiersParMission = new Map<string, Set<string>>();
  for (const l of lignes ?? []) {
    const set = metiersParMission.get(l.mission_id) ?? new Set<string>();
    set.add(l.metier);
    metiersParMission.set(l.mission_id, set);
  }
  const totalMissionsAvecLignes = metiersParMission.size;
  const multiMetiers = [...metiersParMission.values()].filter((s) => s.size > 1).length;

  return {
    familles,
    partMultiMetiers: totalMissionsAvecLignes > 0 ? Math.round((multiMetiers / totalMissionsAvecLignes) * 1000) / 10 : null,
  };
}

export type InsightsPrestataires = {
  fiabiliteBonnePart: number | null;
  niveauxElite: number;
  suspensionsAutomatiques: number;
  tauxAnnulation: number | null;
};

export async function getInsightsPrestataires(): Promise<InsightsPrestataires> {
  const classement = await getClassementPrestataires("tout");
  const { tauxAnnulation } = await getRepartitionStatutMissions();
  const bons = classement.filter((p) => p.score === "bon").length;
  const elite = classement.filter((p) => p.score === "bon" && (p.tauxAcceptation ?? 0) >= 90).length;
  return {
    fiabiliteBonnePart: classement.length > 0 ? Math.round((bons / classement.length) * 1000) / 10 : null,
    niveauxElite: elite,
    suspensionsAutomatiques: 0, // aucune suspension automatique n'existe — toutes sont manuelles (suspendreUtilisateur)
    tauxAnnulation,
  };
}

export type InsightsClients = {
  demandesParMois: number;
  recurrenceMoyenne: number | null;
  panierMoyen: number;
  partEntreprises: number | null;
  segments: { label: string; nbComptes: number; partCa: number }[];
};

export async function getInsightsClients(): Promise<InsightsClients> {
  const admin = createAdminClient();
  const classement = await getClassementRecruteurs("tout");
  const [{ count: totalRecruteurs }, { count: entreprises }, { count: missions30j }] = await Promise.all([
    admin.from("users").select("*", { count: "exact", head: true }).in("type", ["recruteur_particulier", "recruteur_entreprise"]),
    admin.from("users").select("*", { count: "exact", head: true }).eq("type", "recruteur_entreprise"),
    admin.from("missions").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString()),
  ]);

  const avecMission = classement.filter((r) => r.nbMissionsPubliees > 0);
  const recurrenceMoyenne = avecMission.length > 0 ? Math.round((avecMission.reduce((s, r) => s + r.nbMissionsPubliees, 0) / avecMission.length) * 10) / 10 : null;
  const panierMoyen = avecMission.length > 0 ? Math.round((avecMission.reduce((s, r) => s + r.panierMoyen, 0) / avecMission.length) * 100) / 100 : 0;
  const caTotal = classement.reduce((s, r) => s + r.panierMoyen * r.nbMissionsPubliees, 0);

  const buckets = [
    { label: "10 missions et plus", min: 10, max: Infinity },
    { label: "3 à 9 missions", min: 3, max: 9 },
    { label: "1 à 2 missions", min: 1, max: 2 },
    { label: "Aucune mission", min: 0, max: 0 },
  ];
  const segments = buckets.map((b) => {
    const comptes = classement.filter((r) => r.nbMissionsPubliees >= b.min && r.nbMissionsPubliees <= b.max);
    const ca = comptes.reduce((s, r) => s + r.panierMoyen * r.nbMissionsPubliees, 0);
    return { label: b.label, nbComptes: comptes.length, partCa: caTotal > 0 ? Math.round((ca / caTotal) * 1000) / 10 : 0 };
  });

  return {
    demandesParMois: missions30j ?? 0,
    recurrenceMoyenne,
    panierMoyen,
    partEntreprises: totalRecruteurs && totalRecruteurs > 0 ? Math.round(((entreprises ?? 0) / totalRecruteurs) * 1000) / 10 : null,
    segments,
  };
}

export type InsightsFinances = { ca: number; commissions: number; encoursSequestre: number; parMetier: { label: string; montant: number }[] };

export async function getInsightsFinances(): Promise<InsightsFinances> {
  const admin = createAdminClient();
  const [resume, { data: sequestre }, { data: lignes }] = await Promise.all([
    getResumeCommissions(),
    admin.from("paiements").select("montant").eq("statut", "sequestre"),
    admin.from("mission_lignes").select("metier, tarif_applique"),
  ]);
  const ca = resume.totalPercuLibere + resume.totalEnAttente;
  const parMetierMap = new Map<string, number>();
  for (const l of lignes ?? []) {
    parMetierMap.set(l.metier, (parMetierMap.get(l.metier) ?? 0) + Number(l.tarif_applique));
  }
  const parMetier = METIERS.map((m) => ({ label: m.filiere, montant: Math.round((parMetierMap.get(m.id) ?? 0) * 100) / 100 }));

  return {
    ca: Math.round(ca * 100) / 100,
    commissions: resume.totalPercuLibere,
    encoursSequestre: Math.round((sequestre ?? []).reduce((s, p) => s + Number(p.montant), 0) * 100) / 100,
    parMetier,
  };
}

export type InsightsMarche = {
  tensionGlobale: number | null;
  villesCouvertes: number;
  zonesPrioritaires: { ville: string; nbPrestataires: number; nbMissions: number; ecart: number }[];
};

export async function getInsightsMarche(): Promise<InsightsMarche> {
  const villes = await getOffreDemandeParVille();
  const totalMissions = villes.reduce((s, v) => s + v.nbMissions, 0);
  const totalPrestataires = villes.reduce((s, v) => s + v.nbPrestataires, 0);
  const zonesPrioritaires = villes
    .map((v) => ({ ...v, ecart: v.nbMissions - v.nbPrestataires }))
    .sort((a, b) => b.ecart - a.ecart)
    .slice(0, 10);

  return {
    tensionGlobale: totalPrestataires > 0 ? Math.round((totalMissions / totalPrestataires) * 100) / 100 : null,
    villesCouvertes: villes.filter((v) => v.nbPrestataires > 0).length,
    zonesPrioritaires,
  };
}
