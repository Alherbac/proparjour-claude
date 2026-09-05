import type { Metadata } from "next";
import { getSessionClient, getOffresAvecCandidatures } from "@/app/client/_data";
import { EcranCandidatures } from "@/app/client/candidatures/ecran";

export const metadata: Metadata = { title: "Candidatures reçues — ProParJour" };

export default async function PageCandidatures() {
  const session = await getSessionClient();
  if (!session) return null;
  const offres = await getOffresAvecCandidatures(session.userId);
  return <EcranCandidatures offres={offres} />;
}
