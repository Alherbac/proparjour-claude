import type { MetierId } from "@/config/metiers";

/**
 * Données de démonstration pour le carrousel "Freelances de la région"
 * — à remplacer par les résultats de l'API de recherche (Étape 4).
 */
export type FreelanceDemo = {
  id: string;
  prenom: string;
  metier: MetierId;
  ville: string;
  gradient: string;
};

export const FREELANCES_DEMO: FreelanceDemo[] = [
  { id: "1", prenom: "Amadou", metier: "securite", ville: "Paris", gradient: "from-primary/30 to-primary/5" },
  { id: "2", prenom: "Léa", metier: "accueil", ville: "Boulogne-Billancourt", gradient: "from-amber-300/30 to-amber-100/10" },
  { id: "3", prenom: "Karim", metier: "vente", ville: "Nanterre", gradient: "from-emerald-300/30 to-emerald-100/10" },
  { id: "4", prenom: "Manon", metier: "accueil", ville: "Versailles", gradient: "from-sky-300/30 to-sky-100/10" },
  { id: "5", prenom: "Yanis", metier: "securite", ville: "Créteil", gradient: "from-primary/30 to-primary/5" },
  { id: "6", prenom: "Chloé", metier: "vente", ville: "Issy-les-Moulineaux", gradient: "from-fuchsia-300/30 to-fuchsia-100/10" },
];
