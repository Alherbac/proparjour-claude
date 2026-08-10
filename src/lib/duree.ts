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
