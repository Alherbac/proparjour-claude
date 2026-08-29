import { DOCUMENTS_REQUIS } from "@/config/documents-requis";
import type { PrestatairesProfilsRow, JustificatifsRow, MetierType } from "@/lib/supabase/database.types";

/**
 * Complétude du profil (Bloc 5, §11) — pourcentage strictement
 * mécanique (nombre de champs réellement renseignés / nombre de
 * champs vérifiés), jamais une estimation. Chaque item manquant
 * pointe vers l'endroit du compte où l'ajouter.
 */

export type ItemCompletude = {
  cle: string;
  label: string;
  complet: boolean;
  lien: string;
};

export type Completude = {
  pourcentage: number;
  items: ItemCompletude[];
  manquants: ItemCompletude[];
};

export function calculerCompletudeProfil(
  profil: Pick<PrestatairesProfilsRow, "metier" | "photo_url" | "titre" | "bio" | "specialites" | "disponibilites">,
  nbExperiences: number,
  justificatifs: Pick<JustificatifsRow, "type_document">[],
): Completude {
  const items: ItemCompletude[] = [
    { cle: "photo", label: "Photo de profil", complet: Boolean(profil.photo_url), lien: "/tableau-de-bord/compte" },
    { cle: "titre", label: "Titre professionnel", complet: Boolean(profil.titre?.trim()), lien: "/tableau-de-bord/compte" },
    { cle: "bio", label: "Présentation", complet: Boolean(profil.bio?.trim()), lien: "/tableau-de-bord/compte" },
    { cle: "specialites", label: "Au moins une spécialité", complet: profil.specialites.length > 0, lien: "/tableau-de-bord/compte" },
    {
      cle: "disponibilites",
      label: "Disponibilités renseignées",
      complet: profil.disponibilites.length > 0,
      lien: "/tableau-de-bord/compte",
    },
    { cle: "experience", label: "Au moins une expérience", complet: nbExperiences > 0, lien: "/tableau-de-bord/compte" },
  ];

  const requis = DOCUMENTS_REQUIS[profil.metier as MetierType] ?? [];
  if (requis.length > 0) {
    const fournis = requis.every((r) => justificatifs.some((j) => j.type_document === r.type));
    items.push({ cle: "documents", label: "Documents requis fournis", complet: fournis, lien: "/tableau-de-bord/compte" });
  }

  const pourcentage = Math.round((items.filter((i) => i.complet).length / items.length) * 100);

  return { pourcentage, items, manquants: items.filter((i) => !i.complet) };
}
