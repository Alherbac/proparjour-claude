import type { MetierId } from "@/config/metiers";
import type { TarifType } from "@/lib/supabase/database.types";
import { montantMission } from "@/lib/duree";

export const PANIER_STORAGE_KEY = "proparjour:panier";
const STORAGE_KEY = PANIER_STORAGE_KEY;
export const PANIER_EVENT = "proparjour:panier-update";

/**
 * Chaque prestataire du panier porte sa propre date, adresse exacte
 * et description — une prestation multiple peut réunir des personnes
 * sur des lieux ou des jours différents (voir finaliserCommande dans
 * actions/commande.ts, qui regroupe les lignes par date+adresse pour
 * créer une mission par événement réel).
 */
export type LignePanier = {
  prestataireId: string;
  prenom: string;
  metier: MetierId;
  tarifMontant: number;
  tarifType: TarifType;
  heureDebut: string;
  heureFin: string;
  photoUrl: string | null;
  date: string;
  adresse: string;
  description: string;
  selectionnee: boolean;
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

export function ajouterLigne(ligne: Omit<LignePanier, "selectionnee">) {
  const panier = lirePanier();
  ecrirePanier({ lignes: [...panier.lignes, { ...ligne, selectionnee: true }] });
}

export function retirerLigne(index: number) {
  const panier = lirePanier();
  ecrirePanier({ lignes: panier.lignes.filter((_, i) => i !== index) });
}

/** Coche/décoche une ligne — seules les lignes cochées sont envoyées lors du prochain "Envoyer l'offre". */
export function basculerSelectionLigne(index: number) {
  const panier = lirePanier();
  ecrirePanier({
    lignes: panier.lignes.map((l, i) => (i === index ? { ...l, selectionnee: !l.selectionnee } : l)),
  });
}

/** Retire du panier les lignes effectivement envoyées (par index), en conservant celles laissées de côté pour plus tard. */
export function retirerLignesParIndex(indices: number[]) {
  const panier = lirePanier();
  const aRetirer = new Set(indices);
  ecrirePanier({
    lignes: panier.lignes.filter((_, i) => !aRetirer.has(i)),
  });
}

export function viderPanier() {
  ecrirePanier(PANIER_VIDE);
}

export function montantLigne(ligne: LignePanier): number {
  if (ligne.tarifType === "horaire") {
    return montantMission(ligne.heureDebut, ligne.heureFin, ligne.tarifMontant);
  }
  return ligne.tarifMontant;
}

export function totalPanier(panier: Panier): number {
  return Math.round(panier.lignes.reduce((sum, l) => sum + montantLigne(l), 0) * 100) / 100;
}
