import type { Metadata } from "next";
import { getSessionPrestataire, getOffresCorrespondantes, getProfilComplet, getExceptionsDisponibilites, getCandidaturesEnvoyees, tauxReponse } from "@/app/prestataire/_data";
import { creerClientSession } from "@/app/prestataire/_supabase";
import { EcranOpportunites } from "@/app/prestataire/opportunites/ecran";
import type { JourneeMission } from "@/lib/journees";

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

  // Mission multi-jours (migration 0062) — journées réelles de chaque
  // offre (offres_journees), regroupées par offre_id ; repli sur
  // l'unique journée {date_mission, heure_debut, heure_fin} de l'offre
  // dans EcranOpportunites quand une offre n'a pas encore de ligne.
  const journeesParOffre = new Map<string, JourneeMission[]>();
  if (offres.length > 0) {
    const supabase = await creerClientSession();
    const { data: journeesRows } = await supabase
      .from("offres_journees")
      .select("offre_id, date, heure_debut, heure_fin")
      .in("offre_id", offres.map((o) => o.id))
      .order("date", { ascending: true });
    for (const j of journeesRows ?? []) {
      const liste = journeesParOffre.get(j.offre_id) ?? [];
      liste.push({ date: j.date, heureDebut: j.heure_debut.slice(0, 5), heureFin: j.heure_fin.slice(0, 5) });
      journeesParOffre.set(j.offre_id, liste);
    }
  }

  return (
    <EcranOpportunites
      offres={offres}
      journeesParOffre={journeesParOffre}
      idsCandidates={idsCandidates}
      disponibilitesHebdo={profil?.disponibilites ?? []}
      exceptions={exceptions}
      candidaturesEnvoyees={candidatures.length}
      tauxReponse={tauxReponse(candidatures)}
    />
  );
}
