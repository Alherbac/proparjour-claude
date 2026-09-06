import type { PrestataireFormValues } from "@/components/onboarding/prestataire/schema";
import { MAX_SPECIALITES } from "@/config/specialtyCategories";

export type Manquant = { key: string; label: string };

/**
 * Un seul et même calcul de "qu'est-ce qu'il manque" — utilisé à la
 * fois par le bandeau de relance (wizard.tsx), les cartes de temps
 * (compteur "N à remplir") et la checklist de complétion
 * (preview-column.tsx). Dix vérifications au total, réparties sur les
 * trois temps (voir PROMPT-INSCRIPTION.txt §7).
 */
export function missingFor(
  temps: 1 | 2 | 3,
  values: PrestataireFormValues,
  ctx: { existingUser: boolean; hasPhoto: boolean },
): Manquant[] {
  const out: Manquant[] = [];
  if (temps === 1) {
    if (!values.prenom.trim()) out.push({ key: "prenom", label: "votre prénom" });
    if (!values.nom.trim()) out.push({ key: "nom", label: "votre nom" });
    if (!/.+@.+\..+/.test(values.email)) out.push({ key: "email", label: "une adresse e-mail valide" });
    if (!ctx.existingUser && values.motDePasse.length < 8) {
      out.push({ key: "motDePasse", label: "un mot de passe de 8 caractères minimum" });
    }
    if (values.telephone.replace(/\D/g, "").length < 9) out.push({ key: "telephone", label: "votre téléphone" });
    if (!ctx.hasPhoto) out.push({ key: "photo", label: "votre portrait" });
  } else if (temps === 2) {
    if (!values.metier) out.push({ key: "metier", label: "votre secteur" });
    if (!values.titre.trim()) out.push({ key: "titre", label: "votre intitulé de poste" });
    if (values.specialites.length === 0) out.push({ key: "specialites", label: "au moins une spécialité" });
    const tarif = Number(values.tarifMontant);
    if (!values.tarifMontant.trim() || !(tarif > 0)) out.push({ key: "tarifMontant", label: "votre tarif horaire" });
  } else {
    if (!values.ville.trim()) out.push({ key: "ville", label: "votre ville principale" });
    if (!values.disponibilite) out.push({ key: "disponibilite", label: "votre disponibilité" });
    if (!values.accepteCgu) out.push({ key: "accepteCgu", label: "l'acceptation des conditions générales" });
  }
  return out;
}

export type ChecklistItem = { label: string; ok: boolean };

/** Les dix lignes de la checklist "Complété" — regroupent parfois deux vérifications de missingFor (ex. "Nom et prénom"). */
export function checklistFor(values: PrestataireFormValues, ctx: { existingUser: boolean; hasPhoto: boolean }): ChecklistItem[] {
  const tarif = Number(values.tarifMontant);
  return [
    { label: "Nom et prénom", ok: Boolean(values.prenom.trim() && values.nom.trim()) },
    {
      label: "E-mail et mot de passe",
      ok: /.+@.+\..+/.test(values.email) && (ctx.existingUser || values.motDePasse.length >= 8),
    },
    { label: "Téléphone", ok: values.telephone.replace(/\D/g, "").length >= 9 },
    { label: "Portrait", ok: ctx.hasPhoto },
    { label: "Secteur et intitulé", ok: Boolean(values.metier && values.titre.trim()) },
    { label: "Spécialités", ok: values.specialites.length > 0 },
    { label: "Tarif horaire", ok: Boolean(values.tarifMontant.trim() && tarif > 0) },
    { label: "Ville principale", ok: Boolean(values.ville.trim()) },
    { label: "Disponibilité", ok: Boolean(values.disponibilite) },
    { label: "Conditions générales", ok: values.accepteCgu },
  ];
}

export { MAX_SPECIALITES };
