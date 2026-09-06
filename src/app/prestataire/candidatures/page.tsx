import type { Metadata } from "next";
import { getSessionPrestataire, getCandidaturesEnvoyees } from "@/app/prestataire/_data";
import { EcranCandidatures } from "@/app/prestataire/candidatures/ecran";

export const metadata: Metadata = { title: "Mes candidatures — ProParJour" };

export default async function PageMesCandidatures() {
  const session = await getSessionPrestataire();
  if (!session) return null;
  const candidatures = await getCandidaturesEnvoyees(session.profilId);
  return <EcranCandidatures candidatures={candidatures} />;
}
