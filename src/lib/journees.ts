import { heuresEntre, montantMission } from "@/lib/duree";

/**
 * Une journée d'une mission ou d'une offre multi-jours (migration
 * 0062, `mission_lignes_journees` / `offres_journees`) — date et
 * horaires propres à CETTE journée, jamais supposés identiques d'un
 * jour à l'autre. Le cas "1 seule journée" est le cas N=1 du modèle
 * général, jamais un système séparé (voir proposerMission,
 * retenirCandidature, publierOffre, modifierOffre).
 */
export type JourneeMission = {
  date: string;
  heureDebut: string;
  heureFin: string;
};

export type JourneeAvecTarif = JourneeMission & { tarifHoraire: number };

/** Forme jsonb attendue par les RPC `creer_mission_proposee`/`creer_mission_depuis_candidature` (0062) — clés en snake_case, lues côté SQL via `->>`. */
export type JourneeRpc = { date: string; heure_debut: string; heure_fin: string; tarif_applique: number };

/**
 * Trie par date croissante — après tri, la première journée devient
 * la référence `missions.date_mission` / `offres.date_mission`
 * (contrat documenté dans la migration 0062 : jamais recalculée côté
 * SQL pour `creer_mission_proposee`, qui gère plusieurs lignes/
 * prestataires et ne peut pas déduire seule la date la plus ancienne
 * tous prestataires confondus — c'est ici, côté appelant, que ce tri
 * doit avoir lieu).
 */
export function trierJourneesParDate<T extends JourneeMission>(journees: T[]): T[] {
  return [...journees].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function premiereDateJournees(journees: JourneeMission[]): string | null {
  if (journees.length === 0) return null;
  return trierJourneesParDate(journees)[0].date;
}

/**
 * Valide une liste de journées avant tout envoi au serveur/RPC —
 * jamais de confiance aveugle dans ce que le client a construit
 * (même principe que revaliderLignes dans commande.ts). Retourne le
 * premier problème rencontré, ou null si tout est valide.
 */
export function validerJournees(journees: JourneeMission[]): string | null {
  if (journees.length === 0) return "Ajoutez au moins une journée.";
  const datesVues = new Set<string>();
  for (const j of journees) {
    if (!j.date) return "Chaque journée doit avoir une date.";
    if (!j.heureDebut || !j.heureFin) return "Chaque journée doit avoir une heure de début et une heure de fin.";
    if (j.heureDebut === j.heureFin) return "L'heure de fin doit être différente de l'heure de début pour chaque journée.";
    if (datesVues.has(j.date)) return "Deux journées ne peuvent pas avoir la même date.";
    datesVues.add(j.date);
  }
  return null;
}

/**
 * Durée totale multi-jours = somme des durées de chaque journée.
 * JAMAIS `dateFinGlobale - dateDebutGlobale` : une mission de
 * plusieurs jours n'est pas un intervalle continu (règle produit,
 * "mission multi-jours").
 */
export function dureeTotaleJournees(journees: JourneeMission[]): number {
  return journees.reduce((total, j) => total + heuresEntre(j.heureDebut, j.heureFin), 0);
}

/**
 * Montant total multi-jours = somme des montants de chaque journée
 * (chaque journée a sa propre durée, le tarif horaire restant celui
 * de la ligne/l'offre). La commission n'intervient JAMAIS ici — elle
 * se calcule une seule fois, au niveau mission, sur ce total (voir
 * lib/facturation.ts::repartitionLigne, moteur financier unique).
 */
export function montantTotalJournees(journees: JourneeAvecTarif[]): number {
  return Math.round(journees.reduce((total, j) => total + montantMission(j.heureDebut, j.heureFin, j.tarifHoraire), 0) * 100) / 100;
}

/** Construit le tableau jsonb attendu par les RPC — journées triées par date croissante, montant par journée recalculé côté serveur (jamais transmis tel quel depuis un éventuel calcul client). */
export function versJourneesRpc(journees: JourneeAvecTarif[]): JourneeRpc[] {
  return trierJourneesParDate(journees).map((j) => ({
    date: j.date,
    heure_debut: j.heureDebut,
    heure_fin: j.heureFin,
    tarif_applique: montantMission(j.heureDebut, j.heureFin, j.tarifHoraire),
  }));
}
