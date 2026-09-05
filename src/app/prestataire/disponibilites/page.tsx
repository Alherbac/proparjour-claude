import type { Metadata } from "next";
import { getSessionPrestataire, getProfilComplet, getExceptionsDisponibilites, getLignesPrestataire, missionsAVenir } from "@/app/prestataire/_data";
import { EcranDisponibilites } from "@/app/prestataire/disponibilites/ecran";

export const metadata: Metadata = { title: "Disponibilités — ProParJour" };

export default async function PageDisponibilites() {
  const session = await getSessionPrestataire();
  if (!session) return null;

  const [profil, exceptions, lignes] = await Promise.all([
    getProfilComplet(session.userId),
    getExceptionsDisponibilites(session.profilId),
    getLignesPrestataire(session.profilId),
  ]);

  const joursMission = missionsAVenir(lignes).map((l) => l.mission.date_mission);

  return (
    <EcranDisponibilites
      disponibilitesHebdo={profil?.disponibilites ?? []}
      exceptionsInitiales={exceptions}
      joursMission={joursMission}
    />
  );
}
