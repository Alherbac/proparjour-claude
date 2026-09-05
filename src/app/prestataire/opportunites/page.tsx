import type { Metadata } from "next";
import { getSessionPrestataire, getOffresCorrespondantes, getProfilComplet, getExceptionsDisponibilites, getCandidaturesEnvoyees, tauxReponse } from "@/app/prestataire/_data";
import { EcranOpportunites } from "@/app/prestataire/opportunites/ecran";

export const metadata: Metadata = { title: "Opportunités — ProParJour" };

export default async function PageOpportunites() {
  const session = await getSessionPrestataire();
  if (!session) return null;

  const [{ offres, idsCandidates }, profil, exceptions, candidatures] = await Promise.all([
    getOffresCorrespondantes(session.metier, session.profilId),
    getProfilComplet(session.userId),
    getExceptionsDisponibilites(session.profilId),
    getCandidaturesEnvoyees(session.profilId),
  ]);

  return (
    <EcranOpportunites
      offres={offres}
      idsCandidates={idsCandidates}
      disponibilitesHebdo={profil?.disponibilites ?? []}
      exceptions={exceptions}
      candidaturesEnvoyees={candidatures.length}
      tauxReponse={tauxReponse(candidatures)}
    />
  );
}
