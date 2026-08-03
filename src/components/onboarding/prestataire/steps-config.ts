import type { MetierId } from "@/config/metiers";
import type { PrestataireFormValues } from "@/components/onboarding/prestataire/schema";

export type StepId =
  | "coordonnees"
  | "metier"
  | "specialites"
  | "localisation"
  | "tarif"
  | "photo"
  | "justificatifs"
  | "cgu";

export type StepDefinition = {
  id: StepId;
  title: string;
  tip: string;
  fields: (keyof PrestataireFormValues)[];
};

const BASE_STEPS: StepDefinition[] = [
  {
    id: "coordonnees",
    title: "Vos coordonnées",
    tip: "Ces informations restent privées et ne sont partagées qu'après acceptation d'une mission.",
    fields: ["prenom", "nom", "email", "telephone", "statutIndependant"],
  },
  {
    id: "metier",
    title: "Votre métier",
    tip: "Ce choix détermine les questions suivantes et les missions qui vous seront proposées.",
    fields: ["metier"],
  },
  {
    id: "specialites",
    title: "Vos spécialités",
    tip: "Plus votre profil est précis, plus vous recevez de propositions pertinentes.",
    fields: [],
  },
  {
    id: "localisation",
    title: "Votre zone d'intervention",
    tip: "Nous ouvrons progressivement de nouvelles villes en dehors de l'Île-de-France.",
    fields: ["ville"],
  },
  {
    id: "tarif",
    title: "Tarif & disponibilités",
    tip: "Vous pourrez ajuster votre tarif à tout moment depuis votre tableau de bord.",
    fields: ["tarifType", "tarifMontant", "disponibilites"],
  },
  {
    id: "photo",
    title: "Photo de profil",
    tip: "Les profils avec photo reçoivent 3 fois plus de propositions de mission.",
    fields: [],
  },
  {
    id: "justificatifs",
    title: "Justificatifs",
    tip: "Votre carte CNAPS est vérifiée manuellement avant l'activation de votre profil.",
    fields: ["numeroCarteCnaps"],
  },
  {
    id: "cgu",
    title: "Dernière étape",
    tip: "Relisez votre profil avant de le publier — vous pourrez le modifier ensuite.",
    fields: ["accepteCgu"],
  },
];

export function getStepsForMetier(metier?: MetierId): StepDefinition[] {
  return BASE_STEPS.filter((step) => {
    if (step.id === "justificatifs") return metier === "securite";
    return true;
  }).map((step) => {
    if (step.id !== "specialites") return step;
    const fields: (keyof PrestataireFormValues)[] =
      metier === "securite"
        ? ["specialites", "numeroCarteCnaps", "certifications"]
        : metier === "accueil"
          ? ["specialites", "langues", "tenue"]
          : metier === "vente"
            ? ["specialites", "secteurExperience", "remunerationCommission"]
            : ["specialites"];
    return { ...step, fields };
  });
}
