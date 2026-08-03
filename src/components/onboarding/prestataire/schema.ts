import { z } from "zod";
import { MAX_SPECIALITES } from "@/config/specialtyCategories";

export const STATUT_INDEPENDANT_VALUES = [
  "auto_entrepreneur",
  "societe",
  "autre",
] as const;

export const STATUTS_INDEPENDANT = [
  { value: "auto_entrepreneur", label: "Auto-entrepreneur" },
  { value: "societe", label: "Société (EURL, SASU...)" },
  { value: "autre", label: "Autre statut indépendant" },
] as const;

export const CERTIFICATIONS_SECURITE = ["SSIAP", "SST", "Habilitation électrique"] as const;
export const LANGUES_DISPONIBLES = ["Français", "Anglais", "Espagnol", "Arabe", "Mandarin"] as const;
export const SECTEURS_VENTE = ["Boutique", "Restaurant", "Salon / Événementiel"] as const;
export const JOURS_SEMAINE = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

export const prestataireSchema = z
  .object({
    prenom: z.string().trim().min(1, "Le prénom est requis"),
    nom: z.string().trim().min(1, "Le nom est requis"),
    email: z.string().trim().email("Adresse e-mail invalide"),
    telephone: z
      .string()
      .trim()
      .min(10, "Numéro de téléphone invalide"),
    motDePasse: z.string().optional(),
    statutIndependant: z.enum(STATUT_INDEPENDANT_VALUES, {
      error: "Sélectionnez votre statut",
    }),

    metier: z.enum(["securite", "accueil", "vente"], {
      error: "Sélectionnez un métier",
    }),

    numeroCarteCnaps: z.string().trim().optional(),
    certifications: z.array(z.string()),
    langues: z.array(z.string()),
    tenue: z.string().trim().optional(),
    secteurExperience: z.string().trim().optional(),
    remunerationCommission: z.boolean(),
    specialites: z
      .array(z.string())
      .min(1, "Sélectionnez au moins une spécialité")
      .max(MAX_SPECIALITES, `${MAX_SPECIALITES} spécialités maximum`),

    ville: z.string().trim().min(1, "La ville est requise"),

    tarifType: z.enum(["horaire", "journalier"], {
      error: "Sélectionnez un type de tarif",
    }),
    tarifMontant: z
      .number({ error: "Indiquez un tarif" })
      .positive("Indiquez un tarif supérieur à 0"),
    disponibilites: z
      .array(z.string())
      .min(1, "Sélectionnez au moins un jour de disponibilité"),

    accepteCgu: z.literal(true, {
      error: "Vous devez accepter les CGU pour continuer",
    }),
  });

export type PrestataireFormValues = z.infer<typeof prestataireSchema>;

export const PRESTATAIRE_DEFAULT_VALUES: Partial<PrestataireFormValues> = {
  certifications: [],
  langues: [],
  specialites: [],
  remunerationCommission: false,
  disponibilites: [],
  tarifType: "journalier",
};
