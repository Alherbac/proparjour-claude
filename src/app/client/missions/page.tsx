import type { Metadata } from "next";
import { getSessionClient, getMissionsClient, getOffresAvecCandidatures, offresEnRecherche } from "@/app/client/_data";
import { EcranMissions } from "@/app/client/missions/ecran";

export const metadata: Metadata = { title: "Vos missions — ProParJour" };

export default async function PageMissions() {
  const session = await getSessionClient();
  if (!session) return null;
  // Une offre publiée sans candidat retenu n'a pas encore de ligne
  // dans `missions` (voir diagnostic) : récupérée séparément depuis
  // `offres`, jamais transformée en mission ici.
  const [missions, offres] = await Promise.all([
    getMissionsClient(session.userId),
    getOffresAvecCandidatures(session.userId),
  ]);
  return <EcranMissions missions={missions} offresEnRecherche={offresEnRecherche(offres)} />;
}
