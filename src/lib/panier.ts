import type { MetierId } from "@/config/metiers";
import type { TarifType } from "@/lib/supabase/database.types";

export const PANIER_STORAGE_KEY = "proparjour:panier";
const STORAGE_KEY = PANIER_STORAGE_KEY;
export const PANIER_EVENT = "proparjour:panier-update";

export type LignePanier = {
  prestataireId: string;
  prenom: string;
  metier: MetierId;
  tarifMontant: number;
  tarifType: TarifType;
  heureDebut: string;
  heureFin: string;
};

export type Panier = {
  lieu: string;
  dateMission: string;
  lignes: LignePanier[];
};

const PANIER_VIDE: Panier = { lieu: "", dateMission: "", lignes: [] };

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

/**
 * Une mission = un événement (une date, un lieu) — voir cahier des
 * charges section 7. Le lieu/date du premier ajout s'impose au panier ;
 * les ajouts suivants les réutilisent (mais restent modifiables depuis
 * la page panier).
 */
export function ajouterLigne(ligne: LignePanier, contexte: { lieu: string; dateMission: string }) {
  const panier = lirePanier();
  const dejaCadre = panier.lignes.length > 0;
  ecrirePanier({
    lieu: dejaCadre ? panier.lieu : contexte.lieu,
    dateMission: dejaCadre ? panier.dateMission : contexte.dateMission,
    lignes: [...panier.lignes, ligne],
  });
}

export function retirerLigne(index: number) {
  const panier = lirePanier();
  const lignes = panier.lignes.filter((_, i) => i !== index);
  ecrirePanier({
    lieu: lignes.length > 0 ? panier.lieu : "",
    dateMission: lignes.length > 0 ? panier.dateMission : "",
    lignes,
  });
}

export function mettreAJourContexte(contexte: { lieu: string; dateMission: string }) {
  const panier = lirePanier();
  ecrirePanier({ ...panier, ...contexte });
}

export function viderPanier() {
  ecrirePanier(PANIER_VIDE);
}

export function montantLigne(ligne: LignePanier): number {
  if (ligne.tarifType === "horaire") {
    const [hd, md] = ligne.heureDebut.split(":").map(Number);
    const [hf, mf] = ligne.heureFin.split(":").map(Number);
    // Mission de nuit (ex. 18h-2h, l'exemple même du cahier des
    // charges) : l'heure de fin "avant" l'heure de début sur l'horloge
    // signifie qu'elle tombe le lendemain — on ajoute 24h.
    const debut = hd + md / 60;
    let fin = hf + mf / 60;
    if (fin <= debut) fin += 24;
    const heures = fin - debut;
    return Math.max(0, Math.round(heures * ligne.tarifMontant * 100) / 100);
  }
  return ligne.tarifMontant;
}

export function totalPanier(panier: Panier): number {
  return Math.round(panier.lignes.reduce((sum, l) => sum + montantLigne(l), 0) * 100) / 100;
}
