import type { MetierId } from "@/config/metiers";

/**
 * Taxonomie des spécialités par métier — source de vérité unique pour :
 * 1. la sélection à l'inscription (1 à `MAX_SPECIALITES` par prestataire) ;
 * 2. l'affichage en badges sur la fiche publique ;
 * 3. l'indexation recherche (les libellés sont les mots-clés recherchables,
 *    ex. "SSIAP", "Vigipirate" — voir colonne `specialites` de
 *    `prestataires_profils`, indexée en GIN pour l'Étape 4).
 */

export type SpecialiteCategorie = {
  label: string;
  specialites: readonly string[];
};

export const MAX_SPECIALITES = 6;

export const SPECIALTY_CATEGORIES: Record<
  MetierId,
  readonly SpecialiteCategorie[]
> = {
  securite: [
    {
      label: "Surveillance & Gardiennage",
      specialites: [
        "Magasin / Retail",
        "Arrière-caisse / Vidéo",
        "Contrôle d'accès / Site industriel",
        "Rondier / Vigipirate",
      ],
    },
    {
      label: "Événementiel & Nuit",
      specialites: [
        "Bar / Restaurant",
        "Boîte de nuit / Clubbing",
        "Événementiel / Concert",
        "Accueil Sécurisé / VIP",
      ],
    },
    {
      label: "Spécialisé & Incendie",
      specialites: [
        "Sécurité Incendie (SSIAP 1/2)",
        "Agent Cynophile (Maître-chien)",
        "Agent de Prévention et de Secours",
        "Sécurité Luxe / Hôtellerie",
      ],
    },
  ],
  accueil: [
    {
      label: "Événementiel",
      specialites: [
        "Salon / Congrès",
        "Cocktail / Soirée",
        "Promotion / Street Marketing",
        "Émargement / Pass",
        "Accueil Mobile",
      ],
    },
    {
      label: "Entreprise & Luxe",
      specialites: [
        "Accueil Entreprise",
        "Accueil VIP / Luxe",
        "Standardiste / Téléphonie",
        "Conciergerie",
      ],
    },
    {
      label: "Spécialisé",
      specialites: [
        "Accueil Médical / Secrétariat",
        "Accueil Beauté / Cosmétique",
        "Chef(fe) de projet événementiel",
        "Accueil Automobile",
        "Hôte(sse) de Vestiaire",
        "Accueil Aéroportuaire",
        "Accueil Culturel (Musée/Expo)",
      ],
    },
  ],
  vente: [
    {
      label: "Restauration",
      specialites: [
        "Serveur(se)",
        "Cuisinier(ère)",
        "Commis de cuisine",
        "Équipier polyvalent",
      ],
    },
    {
      label: "Retail & Distribution",
      specialites: [
        "Vendeur(se)",
        "Hôte(sse) de caisse",
        "Employé libre service",
        "Mise en rayon",
        "Cosmétique & Parfumerie - Conseil",
        "Prêt-à-porter",
        "Équipement sportif",
        "Bricolage",
      ],
    },
    {
      label: "Artisanat",
      specialites: [
        "Boulanger(ère)",
        "Pâtissier(ère)",
        "Boucher(ère)",
        "Fromager(ère)",
      ],
    },
  ],
};
