/**
 * Lecture du panier — stocké en localStorage, jamais en base (aucune
 * table "panier" dans le schéma réel). Même clé de stockage que le
 * reste du site pour rester compatible avec les ajouts faits depuis
 * une fiche prestataire existante, mais lu ici avec un code propre à
 * /client — aucun import de src/lib/panier.ts (Règle N°0).
 */
const CLE_STOCKAGE = "proparjour:panier";

export type LignePanierClient = {
  prestataireId: string;
  prenom: string;
  metier: string;
  tarifMontant: number;
  tarifType: string;
  photoUrl: string | null;
  certifications?: string[];
};

export const EVENEMENT_PANIER = "proparjour-client:panier-update";

export function lirePanierClient(): LignePanierClient[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CLE_STOCKAGE);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { lignes?: LignePanierClient[] };
    return parsed.lignes ?? [];
  } catch {
    return [];
  }
}

export function retirerDuPanierClient(prestataireId: string) {
  const lignes = lirePanierClient().filter((l) => l.prestataireId !== prestataireId);
  window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ lignes }));
  window.dispatchEvent(new Event(EVENEMENT_PANIER));
}
