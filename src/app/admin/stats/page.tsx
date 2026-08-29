import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { getRepartitionParMetier, getRepartitionStatutMissions } from "@/lib/admin/statistiques";
import { StatistiquesScreen } from "@/components/admin/statistiques-screen";

export const metadata: Metadata = { title: "Statistiques — Admin ProParJour" };

export default async function AdminStatsPage() {
  await requireAdminSession();
  const [repartitionMetier, { parStatut, total, tauxAnnulation }] = await Promise.all([
    getRepartitionParMetier(),
    getRepartitionStatutMissions(),
  ]);

  return (
    <StatistiquesScreen
      repartitionMetier={repartitionMetier}
      repartitionStatut={parStatut}
      total={total}
      tauxAnnulation={tauxAnnulation}
    />
  );
}
