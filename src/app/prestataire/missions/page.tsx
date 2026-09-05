import type { Metadata } from "next";
import { getSessionPrestataire, getLignesPrestataire } from "@/app/prestataire/_data";
import { EcranMissions } from "@/app/prestataire/missions/ecran";

export const metadata: Metadata = { title: "Vos missions — ProParJour" };

export default async function PagePrestataireMissions() {
  const session = await getSessionPrestataire();
  if (!session) return null;
  const lignes = await getLignesPrestataire(session.profilId);
  return <EcranMissions lignes={lignes} />;
}
