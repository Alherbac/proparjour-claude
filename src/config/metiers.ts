/**
 * Les 3 filières de prestataires proposées au lancement — voir
 * cahier-des-charges.md, sections 2.2 et 4.
 */

export const METIERS = [
  {
    id: "securite",
    label: "Agent de sécurité",
    filiere: "Sécurité privée",
    justificatifRequis: "Carte professionnelle CNAPS",
  },
  {
    id: "accueil",
    label: "Hôte / Hôtesse d'accueil",
    filiere: "Accueil & Réception",
    justificatifRequis: null,
  },
  {
    id: "vente",
    label: "Vendeur / Commercial",
    filiere: "Commerce & Retail",
    justificatifRequis: null,
  },
] as const;

export type MetierId = (typeof METIERS)[number]["id"];
