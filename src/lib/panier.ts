import type { MetierId } from "@/config/metiers";
import type { TarifType } from "@/lib/supabase/database.types";

export const PANIER_STORAGE_KEY = "proparjour:panier";
const STORAGE_KEY = PANIER_STORAGE_KEY;
export const PANIER_EVENT = "proparjour:panier-update";

/**
 * "proparjour 6-7", §8 (RÉVISÉ) — le panier est une simple liste de
 * personnes retenues : aucun détail de mission (date/horaires/lieu),
 * aucun tarif négocié, aucun total. Ces informations sont désormais
 * saisies une seule fois, à l'étape suivante ("Proposer la mission",
 * voir besoin-proposition.tsx) plutôt que ligne par ligne ici. Le
 * paiement n'a plus lieu depuis le panier non plus — il n'intervient
 * qu'après acceptation d'un professionnel, sur la mission déjà créée
 * (carte de devis existante, voir components/missions/devis-card.tsx).
 *
 * Pour la réservation directe et payée immédiatement d'une équipe déjà
 * connue ("Refaire une mission", "Créer une série récurrente"), voir
 * LigneReservation dans app/actions/commande.ts — un type distinct,
 * volontairement plus chargé, qui ne transite jamais par ce panier.
 */
export type LignePanier = {
  prestataireId: string;
  prenom: string;
  metier: MetierId;
  tarifMontant: number;
  tarifType: TarifType;
  photoUrl: string | null;
  /** Dossier design, écran "Panier" — {{c.meta}}/{{c.qualifs}} : mêmes
   * certifications que la fiche publique, jamais une donnée inventée
   * pour le panier. Optionnel pour rester compatible avec un panier
   * déjà en localStorage avant l'ajout de ce champ. */
  certifications?: string[];
};

export type Panier = {
  lignes: LignePanier[];
};

const PANIER_VIDE: Panier = { lignes: [] };

export function lirePanier(): Panier {
  if (typeof window === "undefined") return PANIER_VIDE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return PANIER_VIDE;
    const parsed = JSON.parse(raw) as Panier;
    return { ...PANIER_VIDE, ...parsed };
  } catch {
    return PANIER_VIDE;
  }
}

function ecrirePanier(panier: Panier) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(panier));
  window.dispatchEvent(new Event(PANIER_EVENT));
}

export function ajouterLigne(ligne: LignePanier) {
  const panier = lirePanier();
  ecrirePanier({ lignes: [...panier.lignes, ligne] });
}

export function retirerLigne(index: number) {
  const panier = lirePanier();
  ecrirePanier({ lignes: panier.lignes.filter((_, i) => i !== index) });
}

/** true si ce prestataire a déjà au moins une ligne au panier — utilisé par le bouton bascule "Ajouter/Retirer du panier" de la fiche prestataire. */
export function estDansPanier(prestataireId: string): boolean {
  return lirePanier().lignes.some((l) => l.prestataireId === prestataireId);
}

/** Retire toutes les lignes d'un prestataire donné — pendant du "Retirer du panier", qui ne connaît qu'un état bascule par prestataire, pas un index de ligne précis. */
export function retirerParPrestataire(prestataireId: string) {
  const panier = lirePanier();
  ecrirePanier({ lignes: panier.lignes.filter((l) => l.prestataireId !== prestataireId) });
}

export function viderPanier() {
  ecrirePanier(PANIER_VIDE);
}
