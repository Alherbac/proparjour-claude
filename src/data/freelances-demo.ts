import type { MetierId } from "@/config/metiers";

/**
 * Données de démonstration pour le carrousel et les fiches profil
 * — à remplacer par les résultats de l'API de recherche (Étape 4).
 */
export type Avis = {
  auteur: string;
  note: number;
  commentaire: string;
  date: string;
};

export type BadgeVerification = "cnaps" | "identite" | "premium";

export type FreelanceDemo = {
  id: string;
  prenom: string;
  nom: string;
  metier: MetierId;
  ville: string;
  gradient: string;
  bio: string;
  anneesExperience: number;
  note: number;
  nombreAvis: number;
  badges: BadgeVerification[];
  tarifType: "horaire" | "journalier";
  tarifMontant: number;
  disponibilites: string[];
  specialites: string[];
  avis: Avis[];
};

export const FREELANCES_DEMO: FreelanceDemo[] = [
  {
    id: "1",
    prenom: "Amadou",
    nom: "Diallo",
    metier: "securite",
    ville: "Paris",
    gradient: "from-primary/30 to-primary/5",
    bio: "Agent de sécurité certifié CNAPS avec 6 ans d'expérience en événementiel et gardiennage de sites sensibles. Sérieux, ponctuel et réactif.",
    anneesExperience: 6,
    note: 4.9,
    nombreAvis: 47,
    badges: ["cnaps", "identite", "premium"],
    tarifType: "journalier",
    tarifMontant: 190,
    disponibilites: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
    specialites: ["SSIAP 1", "SST", "Filtrage événementiel"],
    avis: [
      { auteur: "Camille R.", note: 5, commentaire: "Très professionnel, à l'heure et efficace. Je recommande.", date: "Juillet 2026" },
      { auteur: "Studio Lumen", note: 5, commentaire: "Agent parfait pour notre soirée de lancement, très rassurant.", date: "Juin 2026" },
      { auteur: "Marc T.", note: 4, commentaire: "Bonne prestation, arrivé quelques minutes en retard.", date: "Mai 2026" },
    ],
  },
  {
    id: "2",
    prenom: "Léa",
    nom: "Martin",
    metier: "accueil",
    ville: "Boulogne-Billancourt",
    gradient: "from-amber-300/30 to-amber-100/10",
    bio: "Hôtesse d'accueil bilingue anglais, spécialisée en salons professionnels et soirées d'entreprise. Sourire et sens du service garantis.",
    anneesExperience: 4,
    note: 4.8,
    nombreAvis: 32,
    badges: ["identite", "premium"],
    tarifType: "horaire",
    tarifMontant: 22,
    disponibilites: ["Jeu", "Ven", "Sam", "Dim"],
    specialites: ["Anglais courant", "Accueil VIP", "Vestiaire"],
    avis: [
      { auteur: "Agence Kaïros", note: 5, commentaire: "Léa est adorable et très professionnelle, parfaite en anglais.", date: "Juillet 2026" },
      { auteur: "Hôtel Verrière", note: 5, commentaire: "Ponctuelle et souriante toute la soirée.", date: "Juin 2026" },
    ],
  },
  {
    id: "3",
    prenom: "Karim",
    nom: "Belhadj",
    metier: "vente",
    ville: "Nanterre",
    gradient: "from-emerald-300/30 to-emerald-100/10",
    bio: "Vendeur expérimenté en boutique et salons, à l'aise avec les objectifs de vente et la relation client. Ouvert à la rémunération à la commission.",
    anneesExperience: 5,
    note: 4.7,
    nombreAvis: 21,
    badges: ["identite"],
    tarifType: "horaire",
    tarifMontant: 18,
    disponibilites: ["Mar", "Mer", "Sam"],
    specialites: ["Boutique prêt-à-porter", "Techniques de vente", "Encaissement"],
    avis: [
      { auteur: "Boutique Alba", note: 5, commentaire: "Très bons résultats de vente, on le rappellera.", date: "Mai 2026" },
      { auteur: "Salon Déco+", note: 4, commentaire: "Bon relationnel client, dynamique.", date: "Avril 2026" },
    ],
  },
  {
    id: "4",
    prenom: "Manon",
    nom: "Rousseau",
    metier: "accueil",
    ville: "Versailles",
    gradient: "from-sky-300/30 to-sky-100/10",
    bio: "Hôtesse d'accueil pour événements haut de gamme, mariages et conférences. Présentation soignée et grande discrétion.",
    anneesExperience: 3,
    note: 5,
    nombreAvis: 18,
    badges: ["identite", "premium"],
    tarifType: "journalier",
    tarifMontant: 160,
    disponibilites: ["Ven", "Sam", "Dim"],
    specialites: ["Espagnol courant", "Protocole", "Coordination vestiaire"],
    avis: [
      { auteur: "Château de Verrières", note: 5, commentaire: "Manon a été impeccable pour notre mariage.", date: "Juin 2026" },
    ],
  },
  {
    id: "5",
    prenom: "Yanis",
    nom: "Moreau",
    metier: "securite",
    ville: "Créteil",
    gradient: "from-primary/30 to-primary/5",
    bio: "Agent de sécurité polyvalent, missions récurrentes en magasin et en résidentiel. Carte CNAPS à jour, sérieux et discret.",
    anneesExperience: 8,
    note: 4.6,
    nombreAvis: 39,
    badges: ["cnaps", "identite"],
    tarifType: "journalier",
    tarifMontant: 175,
    disponibilites: ["Lun", "Mar", "Mer", "Jeu", "Ven"],
    specialites: ["SSIAP 2", "Rondes de surveillance", "Contrôle d'accès"],
    avis: [
      { auteur: "Centre Commercial Riviera", note: 5, commentaire: "Missions récurrentes sans aucun souci depuis 1 an.", date: "Juillet 2026" },
      { auteur: "Résidence Les Tilleuls", note: 4, commentaire: "Fiable et courtois avec les résidents.", date: "Mars 2026" },
    ],
  },
  {
    id: "6",
    prenom: "Chloé",
    nom: "Fontaine",
    metier: "vente",
    ville: "Issy-les-Moulineaux",
    gradient: "from-fuchsia-300/30 to-fuchsia-100/10",
    bio: "Spécialiste vente événementielle et salons professionnels, à l'aise sur les stands à forte affluence. Anglais professionnel.",
    anneesExperience: 4,
    note: 4.9,
    nombreAvis: 26,
    badges: ["identite", "premium"],
    tarifType: "horaire",
    tarifMontant: 20,
    disponibilites: ["Mer", "Jeu", "Ven", "Sam"],
    specialites: ["Salons professionnels", "Anglais courant", "Démonstration produit"],
    avis: [
      { auteur: "Expo Paris Events", note: 5, commentaire: "Chloé a boosté nos ventes sur le salon, très pro.", date: "Juin 2026" },
    ],
  },
];
