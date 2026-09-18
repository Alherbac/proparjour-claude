/**
 * Nombre d'heures entre deux horaires — une mission de nuit (ex.
 * 18h-2h, l'exemple même du cahier des charges) a une heure de fin
 * "avant" l'heure de début sur l'horloge, ce qui signifie qu'elle
 * tombe le lendemain : on ajoute 24h. Partagé entre le panier
 * (montantLigne) et les offres publiées (montant total affiché).
 */
export function heuresEntre(heureDebut: string, heureFin: string): number {
  const [hd, md] = heureDebut.split(":").map(Number);
  const [hf, mf] = heureFin.split(":").map(Number);
  const debut = hd + md / 60;
  let fin = hf + mf / 60;
  if (fin <= debut) fin += 24;
  return fin - debut;
}

export function montantMission(heureDebut: string, heureFin: string, tarifHoraire: number): number {
  return Math.max(0, Math.round(heuresEntre(heureDebut, heureFin) * tarifHoraire * 100) / 100);
}

/**
 * Montant final recalculé au temps RÉELLEMENT effectué (suivi
 * d'exécution, actions/execution-mission.ts) — jamais un second moteur
 * de tarification : le taux horaire effectif est dérivé du montant
 * déjà convenu au devis (`tarifApplique`) rapporté à la durée PRÉVUE,
 * exactement comme le fait déjà EnvoyerDevisForm (message-thread.tsx)
 * pour préremplir un nouveau devis. `heuresEntre` gère nativement le
 * passage de minuit des deux côtés (prévu et réel) ; l'appelant doit
 * en revanche rejeter lui-même une durée réelle nulle (même heure de
 * début et de fin) AVANT d'appeler cette fonction — ici, ce cas
 * produirait silencieusement une "journée complète" de 24h, correct
 * pour des horaires PRÉVUS (convention déjà établie) mais jamais
 * souhaitable pour une déclaration réelle.
 */
export function calculerMontantFinal(params: {
  heureDebutPrevue: string;
  heureFinPrevue: string;
  tarifApplique: number;
  heureDebutReelle: string;
  heureFinReelle: string;
}): { dureeHeures: number; tarifHoraire: number; montant: number } {
  const dureePrevue = heuresEntre(params.heureDebutPrevue, params.heureFinPrevue);
  const tarifHoraire = Math.round((params.tarifApplique / dureePrevue) * 10000) / 10000;
  const dureeHeures = heuresEntre(params.heureDebutReelle, params.heureFinReelle);
  const montant = Math.round(tarifHoraire * dureeHeures * 100) / 100;
  return { dureeHeures, tarifHoraire, montant };
}
