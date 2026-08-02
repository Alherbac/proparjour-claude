import { z } from "zod";

export const SECTEURS_ACTIVITE = [
  "Événementiel",
  "Restauration",
  "Retail / Boutique",
  "Hôtellerie",
  "Autre",
] as const;

export const recruteurSchema = z
  .object({
    typeCompte: z.enum(["particulier", "entreprise"]),

    prenom: z.string().trim().min(1, "Le prénom est requis"),
    nom: z.string().trim().min(1, "Le nom est requis"),
    email: z.string().trim().email("Adresse e-mail invalide"),
    telephone: z.string().trim().min(10, "Numéro de téléphone invalide"),
    motDePasse: z
      .string()
      .min(8, "8 caractères minimum"),
    ville: z.string().trim().min(1, "La ville est requise"),

    raisonSociale: z.string().trim().optional(),
    siret: z.string().trim().optional(),
    secteurActivite: z.string().trim().optional(),

    accepteCgu: z.literal(true, {
      error: "Vous devez accepter les CGU pour continuer",
    }),
  });

export type RecruteurFormValues = z.infer<typeof recruteurSchema>;

export const RECRUTEUR_DEFAULT_VALUES: Partial<RecruteurFormValues> = {
  typeCompte: "particulier",
};
