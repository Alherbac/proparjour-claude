"use server";

import { recommanderPrestataires, type BesoinMatching, type ResultatMatching } from "@/lib/matching";

export async function obtenirRecommandations(besoin: BesoinMatching): Promise<ResultatMatching> {
  return recommanderPrestataires(besoin);
}
