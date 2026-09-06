import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { getRepartitionStatutMissions, getMissionsParMoisRecent } from "@/lib/admin/statistiques";
import { getActivitePlateforme } from "@/lib/admin/dashboard";
import { getOffreDemandeParVille } from "@/lib/admin/pilotage";
import { getStatsLive, getStatsHistorique30j } from "@/lib/admin/analytics";
import { StatistiquesScreen } from "@/components/admin/statistiques-screen";

export const metadata: Metadata = { title: "Statistiques — Admin ProParJour" };

export default async function AdminStatsPage() {
  await requireAdminSession();
  const [activite30j, topVilles, missionsParMoisRecent, { parStatut, total, tauxAnnulation }, live, historique] = await Promise.all([
    getActivitePlateforme("30j"),
    getOffreDemandeParVille(),
    getMissionsParMoisRecent(),
    getRepartitionStatutMissions(),
    getStatsLive(),
    getStatsHistorique30j(),
  ]);

  return (
    <StatistiquesScreen
      activite30j={activite30j}
      topVilles={topVilles}
      missionsParMoisRecent={missionsParMoisRecent}
      repartitionStatut={parStatut}
      totalMissions={total}
      tauxAnnulation={tauxAnnulation}
      live={live}
      historique={historique}
    />
  );
}
