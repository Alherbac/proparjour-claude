import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { getActivitePlateforme } from "@/lib/admin/dashboard";
import { getRepartitionStatutMissions } from "@/lib/admin/statistiques";
import { KpisScreen } from "@/components/admin/kpis-screen";

export const metadata: Metadata = { title: "KPI stratégiques — Admin ProParJour" };

export default async function AdminKpisPage() {
  await requireAdminSession();
  const [toutesPeriodes, trenteJours, { tauxAnnulation }] = await Promise.all([
    getActivitePlateforme("tout"),
    getActivitePlateforme("30j"),
    getRepartitionStatutMissions(),
  ]);

  return <KpisScreen toutesPeriodes={toutesPeriodes} trenteJours={trenteJours} tauxAnnulation={tauxAnnulation} />;
}
