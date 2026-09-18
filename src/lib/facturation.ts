/**
 * SOURCE DE VÉRITÉ FINANCIÈRE UNIQUE — réutilisée par la page mission,
 * la carte de devis, les cartes d'exécution, la facture client, la
 * facture prestataire et /prestataire/revenus. Jamais un second calcul
 * ailleurs (validation produit définitive, 2026-09-18).
 *
 * MODÈLE DÉFINITIF — un seul prélèvement de commission :
 *
 *   totalClient (109,50 €)                — déjà payé/séquestré par le client
 *   commission = totalClient × taux/100 (16,43 €)
 *   prestation = totalClient − commission (93,07 €)
 *   netPrestataire = prestation (93,07 €) — AUCUNE seconde déduction
 *
 * Vérifié sur l'exemple de référence (5 h, 15 %) : 93,07 + 16,43 =
 * 109,50. Le prestataire reçoit exactement la prestation (93,07 €) ;
 * les 16,43 € de commission sont déjà compris dans les 109,50 € payés
 * par le client, jamais retirés une deuxième fois du prestataire.
 * 76,64 € (modèle à double prélèvement, écarté le 2026-09-18) ne doit
 * apparaître nulle part.
 */

export type LigneMontant = { tarif_applique: number; tarif_final: number | null };

/** Montant du devis accepté, ou le montant final recalculé au temps réellement effectué s'il existe (tarif_final, migration 0059) — jamais les deux additionnés. */
export function montantDuLigne(ligne: LigneMontant): number {
  return ligne.tarif_final ?? ligne.tarif_applique;
}

export type RepartitionLigne = {
  /** Ce que paie le client au total, commission ProParJour comprise. */
  totalClient: number;
  /** Part de `totalClient` prélevée par ProParJour (totalClient × tauxCommission / 100) — déjà comprise dans totalClient, jamais un supplément. */
  commission: number;
  /** totalClient − commission — affichée au client ET au prestataire ("Prestation"). */
  prestation: number;
  /** Identique à `prestation` : ce que reçoit réellement le prestataire. Aucune seconde déduction — un alias explicite pour les écrans qui l'appellent "Net prestataire"/"Votre net". */
  netPrestataire: number;
  tauxCommission: number;
};

export function repartitionLigne(ligne: LigneMontant, tauxCommission: number): RepartitionLigne {
  const totalClient = montantDuLigne(ligne);
  const commission = Math.round(totalClient * (tauxCommission / 100) * 100) / 100;
  const prestation = Math.round((totalClient - commission) * 100) / 100;
  return { totalClient, commission, prestation, netPrestataire: prestation, tauxCommission };
}
