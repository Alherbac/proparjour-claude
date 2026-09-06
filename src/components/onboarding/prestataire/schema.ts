import { z } from "zod";
import type { MetierId } from "@/config/metiers";
import { MAX_SPECIALITES } from "@/config/specialtyCategories";
import { JOURS_SEMAINE } from "@/config/jours-semaine";

// Ré-exporté : consommé par mettreAJourDisponibilites
// (src/app/actions/compte.ts), qui importe JOURS_SEMAINE depuis ce
// fichier plutôt que directement depuis config/ — garder cet export
// même si le nouveau parcours en trois temps ne propose plus de
// sélecteur jour par jour à l'inscription (voir DisponibiliteStatut
// ci-dessous).
export { JOURS_SEMAINE };

export { MAX_SPECIALITES };

/**
 * État brut du formulaire, saisi tel quel par les trois temps —
 * distinct du payload envoyé au serveur (voir PrestataireSubmitPayload
 * plus bas) : ici `tarifMontant` peut être vide pendant la saisie,
 * `anneesExperience` reste une chaîne (comme dans la maquette), et
 * `motDePasse` n'existe que pour un nouveau compte (pas de connexion
 * Google préalable).
 */
export type PrestataireFormValues = {
  // Temps 1 — Qui vous êtes
  prenom: string;
  nom: string;
  email: string;
  motDePasse: string;
  telephone: string;

  // Temps 2 — Ce que vous faites
  metier: MetierId | null;
  titre: string;
  specialites: string[];
  tarifMontant: string;
  anneesExperience: string;

  // Temps 3 — Où et quand
  ville: string;
  zonesDeplacement: string[];
  disponibilite: DisponibiliteStatut | null;
  accepteCgu: boolean;
};

export const PRESTATAIRE_DEFAULT_VALUES: PrestataireFormValues = {
  prenom: "",
  nom: "",
  email: "",
  motDePasse: "",
  telephone: "",
  metier: null,
  titre: "",
  specialites: [],
  tarifMontant: "",
  anneesExperience: "",
  ville: "",
  zonesDeplacement: [],
  disponibilite: null,
  accepteCgu: false,
};

/**
 * Trois statuts affichés au temps 3 — remplacent le sélecteur
 * "jours de disponibilité" de l'ancien parcours (voir mapping vers
 * `disponibilites`/`visible` dans disponibiliteVersChamps ci-dessous).
 * "soon" et "later" laissent `disponibilites` vide : le prestataire
 * précise ses jours plus tard depuis son tableau de bord
 * (/prestataire/disponibilites, déjà existant), pour ne pas ajouter
 * un quatrième temps à l'inscription.
 */
export const DISPONIBILITE_VALUES = ["now", "soon", "later"] as const;
export type DisponibiliteStatut = (typeof DISPONIBILITE_VALUES)[number];

export function disponibiliteVersChamps(statut: DisponibiliteStatut): {
  disponibilites: string[];
  visible: boolean;
} {
  return {
    disponibilites: statut === "now" ? [...JOURS_SEMAINE] : [],
    visible: true,
  };
}

/**
 * Payload réellement envoyé à completerProfilPrestataire — validé
 * côté serveur. Les champs conditionnels au métier de l'ancien
 * parcours (n° CNAPS, langues, tenue, secteur d'expérience, statut
 * indépendant...) n'y figurent plus : ils restent modifiables depuis
 * "Mon compte" (mettreAJourProfilPrestataire, actions/compte.ts) une
 * fois le profil créé, avec des valeurs par défaut sûres appliquées
 * côté serveur (voir actions/inscription.ts).
 */
export const prestataireSubmitSchema = z.object({
  prenom: z.string().trim().min(1, "Le prénom est requis"),
  nom: z.string().trim().min(1, "Le nom est requis"),
  email: z.string().trim().email("Adresse e-mail invalide"),
  telephone: z.string().trim().min(9, "Numéro de téléphone invalide"),

  metier: z.enum(["securite", "accueil", "vente"], { error: "Sélectionnez un métier" }),
  titre: z.string().trim().min(1, "Indiquez votre titre professionnel"),
  specialites: z
    .array(z.string())
    .min(1, "Sélectionnez au moins une spécialité")
    .max(MAX_SPECIALITES, `${MAX_SPECIALITES} spécialités maximum`),
  tarifMontant: z.number({ error: "Indiquez votre tarif horaire" }).positive("Indiquez un tarif horaire supérieur à 0"),
  anneesExperience: z.number().int().min(0).nullable(),

  ville: z.string().trim().min(1, "La ville est requise"),
  zonesDeplacement: z.array(z.string()),
  disponibilites: z.array(z.string()),
  visible: z.boolean(),

  accepteCgu: z.literal(true, { error: "Vous devez accepter les CGU pour continuer" }),
});

export type PrestataireSubmitPayload = z.infer<typeof prestataireSubmitSchema>;
