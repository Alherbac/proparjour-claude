import type { Metadata } from "next";
import { getSessionPrestataire, getLignesPrestataire, getExperiences, getJustificatifsTous, LABEL_METIER } from "@/app/prestataire/_data";
import { EcranProfil } from "@/app/prestataire/profil/ecran";

export const metadata: Metadata = { title: "Votre profil — ProParJour" };

export default async function PageProfil() {
  const session = await getSessionPrestataire();
  if (!session) return null;

  const [lignes, experiences, justificatifs] = await Promise.all([
    getLignesPrestataire(session.profilId),
    getExperiences(session.profilId),
    getJustificatifsTous(session.profilId),
  ]);

  // Missions réellement terminées sur ProParJour — dérivées en lecture,
  // jamais saisies à la main ni dupliquées dans la table `experiences`.
  const experiencesAuto = lignes
    .filter((l) => l.statut_acceptation === "acceptee" && l.mission.statut === "terminee")
    .sort((a, b) => b.mission.date_mission.localeCompare(a.mission.date_mission))
    .map((l) => ({
      id: l.id,
      intitule: LABEL_METIER[l.metier],
      lieu: l.mission.lieu,
      date: l.mission.date_mission,
    }));

  return <EcranProfil photoUrl={session.photoUrl} experiencesAuto={experiencesAuto} experiencesManuelles={experiences} justificatifs={justificatifs} />;
}
